# ContractorFlow

ContractorFlow is an AI-powered CRM for contractors and home service businesses.
Track leads through your pipeline, manage customers and jobs, and use Claude
to draft follow-up messages and full proposals in seconds.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with a custom brand palette
- **Supabase** for Postgres + Auth (with Row Level Security)
- **Anthropic Claude** (Claude Sonnet 4.6 by default) for AI features
- **Stripe** subscriptions with Customer Portal + webhooks

## Features

- Email/password auth (signup, login, signout) with Supabase
- Dashboard: total leads, active jobs, revenue from completed jobs, follow-ups due today
- Leads with `New / Contacted / Estimate Sent / Won / Lost` status
- Customers with name, phone, email, address, notes
- Jobs with start/end dates, status, price, and customer link
- One-click "Convert to job" turns a lead into a customer + scheduled job
- AI follow-up message generator (per lead, with tone selector)
- AI proposal/estimate generator (per lead)
- Calendar / reminder system grouped by Overdue / Today / Tomorrow / Upcoming / Done
- Mobile-friendly UI (sidebar on desktop, bottom tab bar on mobile)
- Stripe Checkout for new subscriptions (14-day trial) + Billing Portal

## Project layout

```
src/
  app/
    (app)/                  # Authenticated app shell (sidebar + mobile nav)
      dashboard/
      leads/                # list, /new, /[id]
      customers/            # list, /new, /[id]
      jobs/                 # list, /new, /[id]
      calendar/
      billing/
      layout.tsx
    api/
      ai/follow-up/route.ts
      ai/proposal/route.ts
      stripe/checkout/route.ts
      stripe/portal/route.ts
      stripe/webhook/route.ts
    auth/signout/route.ts
    login/page.tsx
    signup/page.tsx
    page.tsx                # Marketing landing page
  components/               # Sidebar, MobileNav, StatCard, StatusBadge
  lib/
    ai.ts                   # Anthropic client wrapper
    stripe.ts               # Stripe client wrapper
    supabase/               # browser, server, middleware
    types.ts                # shared TypeScript types
    utils.ts
  middleware.ts             # Refreshes auth + redirects unauthenticated users
supabase/
  schema.sql                # Tables, enums, RLS policies, triggers
```

## Getting started

### 1. Install

```bash
npm install
cp .env.example .env.local
```

### 2. Supabase

1. Create a Supabase project.
2. Open the SQL editor and run the contents of `supabase/schema.sql`.
3. Then run, in order, the files in `supabase/migrations/`:
   - `2026-05-11_marketplace.sql` — lead marketplace tables and RLS
   - `2026-05-11_wallet.sql` — wallet credit + atomic debit RPC
   - `2026-05-11_account_type.sql` — homeowner / contractor account types
   - `2026-05-11_contractor_directory.sql` — public profile fields, credentials, photos, reviews
   - `2026-05-11_revenue.sql` — job cost tracking + review request fields
   - `2026-05-11_recurring.sql` — recurring service engine on customers
   - `2026-05-11_invoicing.sql` — invoices table + Stripe payment link
   - `2026-05-11_lead_sources.sql` — marketplace source attribution + dedupe
   - `2026-05-11_lead_scoring.sql` — AI lead score + speed-to-lead on contractor leads
   - `2026-05-11_messaging.sql` — outbound message log + auto-dispatch toggle
   - `2026-05-11_employees.sql` — employee account type, invites, time entries, tasks, job photos
   - `2026-05-11_lead_gen_engine.sql` — alert webhook, referrals, scraper audit, message templates
   - `2026-05-11_disputes_and_widgets.sql` — lead disputes (auto-refund) + partner widgets (reverse marketplace)
4. Copy your project URL, anon key, and service role key into `.env.local`.

The schema enables Row Level Security so each user can only see their own
customers, leads, jobs, and follow-ups. Marketplace leads are readable by any
authenticated user while `available`, and only their buyer once `sold`.

### 3. AI provider

Set `ANTHROPIC_API_KEY` to use Claude. The default model is `claude-sonnet-4-6`;
override with `ANTHROPIC_MODEL` if needed.

### 4. Stripe

1. Create a recurring price in Stripe and put its ID in `STRIPE_PRICE_ID`.
2. Set `STRIPE_SECRET_KEY`.
3. For local webhook testing:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   then put the signing secret it prints into `STRIPE_WEBHOOK_SECRET`.

### 5. Run

```bash
npm run dev
```

Visit <http://localhost:3000>.

### 6. Daily cron (optional, for recurring jobs + marketplace cleanup)

The deployed instance ships with a Vercel Cron Job defined in `vercel.json`
that hits `/api/cron/daily` at 08:00 UTC every day. The endpoint:

- Generates the next job + reminder for any customer whose recurring schedule
  is due.
- Marks marketplace leads as `expired` past their `expires_at` window.

Set `CRON_SECRET` (Vercel → Settings → Environment Variables) to any long
random string. Vercel Cron will include it as `Authorization: Bearer <secret>`
when calling the endpoint. To trigger manually locally:

```bash
curl http://localhost:3000/api/cron/daily
```

## Notes

- All authenticated routes live under the `(app)` route group, which redirects
  unauthenticated visitors via `src/app/(app)/layout.tsx` and the auth
  middleware in `src/middleware.ts`.
- The Stripe webhook uses the Supabase service role key to bypass RLS when
  syncing subscription status. Keep that key server-only.
- This is an MVP — there's no team/multi-user logic, no file uploads, and
  the calendar is a simple list view rather than a month grid.
