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
   - `2026-05-11_wave9_platform.sql` — auto-bid + booking + push + agency + brand + inbound SMS
   - `2026-05-11_notification_prefs.sql` — per-contractor notification toggles (email/push/webhook/SMS)
   - `2026-05-11_onboarding_videos.sql` — per-profile onboarding video list (JSONB)
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

## Auto-Outreach engine

A sub-system that discovers local-service businesses, AI-scans their digital
presence, generates a personalized landing page + Google/Meta ad strategy,
and pitches them via email or SMS — all from one operator dashboard at
`/owner/auto-outreach`.

**Pipeline**

1. **Discover** — Google Places (New) text search by city + trade. Falls back
   to synthetic demo data if `GOOGLE_PLACES_API_KEY` isn't set.
2. **Scan** — Fetch the prospect's existing site, heuristically score
   speed/design/SEO/conversion, benchmark against 3 local competitors, and
   ask Claude for a plain-English audit (weaknesses + opportunities).
3. **Generate** — Claude builds a complete `SiteContent` payload (hero copy,
   services, about, reviews, FAQ, theme colors, SEO) plus per-platform ad
   strategies with realistic budgets, keywords, CPLs, and ad copy variants.
4. **Outreach** — AI-personalized email / SMS that references one specific
   scan finding and links to the live preview. Uses the shared
   `src/lib/messaging.ts` helpers (Resend + Twilio, respects `TEST_MODE`).
5. **Claim** — Prospect clicks "Claim this site" → Stripe Checkout (one-time,
   monthly hosting, or done-for-you ads). Webhook flips the prospect to
   `converted` and links the subscription.

**Per-prospect preview sites** are rendered by `/sites/[slug]/page.tsx` and
served on a wildcard subdomain (`*.{NEXT_PUBLIC_OUTREACH_SITES_DOMAIN}`) via
a middleware rewrite. No per-site deploy — all sites are one Next.js app
reading from `ao_sites.content` (JSONB) by slug.

**Module layout**

```
src/lib/auto-outreach/
  types.ts          shared types
  places.ts         Google Places + synthetic fallback
  scanner.ts        website fetch + heuristic scoring + Claude audit
  generator.ts      Claude site-content generator + slug
  ads.ts            Claude Google + Meta strategy generator
  outreach.ts       AI personalization + send + log
  pipeline.ts       end-to-end orchestrator
  auth.ts           owner-only API gate

src/app/api/auto-outreach/
  discover/                   POST  Places search → insert prospects
  scan/                       POST  scan + audit one prospect
  generate/                   POST  generate site + ad strategies
  outreach/                   POST  send one email or SMS
  pipeline/                   POST  scan → generate → outreach in one call
  claim/                      POST  PUBLIC — start Stripe checkout
  stripe-webhook/             POST  PUBLIC — handle checkout.session.completed
  track/[id]/                 GET   PUBLIC — email open pixel
  unsubscribe/                GET   PUBLIC — opt-out link

src/app/(app)/owner/auto-outreach/
  page.tsx                    dashboard (stats + recent activity)
  prospects/                  filterable prospect list
  prospects/[id]/             full detail + action buttons
  discover/                   start a new Places search
  campaigns/                  reusable message templates

src/app/sites/
  layout.tsx                  bare layout for public previews
  [slug]/page.tsx             public landing page (loaded from ao_sites by slug)
  [slug]/claim/               pricing + Stripe checkout
  [slug]/thanks/              post-claim thank you

supabase/migrations/
  2026-05-23_auto_outreach.sql  ao_prospects, ao_scans, ao_sites,
                                ao_ad_strategies, ao_campaigns,
                                ao_outreach_log, ao_subscriptions
```

**Required env vars** (see `.env.example`)

| Var | Purpose |
| --- | --- |
| `GOOGLE_PLACES_API_KEY` | Real prospect discovery. Optional — falls back to synthetic data. |
| `NEXT_PUBLIC_OUTREACH_SITES_DOMAIN` | Wildcard domain for `*.previews.contractorflow.com` previews. Optional — falls back to `/sites/[slug]` on the main domain. |
| `STRIPE_PRICE_OUTREACH_ONETIME` / `_MONTHLY` / `_ADMGMT` | Stripe price IDs for the three claim plans. |
| `ANTHROPIC_API_KEY` | Already wired (`src/lib/ai.ts`) — used for audit, site, ads, message personalization. |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | Outbound cold email. |
| `TWILIO_*` | Outbound SMS. |
| `TEST_MODE=1` | Logs sends instead of delivering — safe for first runs. |

**Operator workflow**

1. `/owner/auto-outreach/discover` — enter trade + city → click discover.
2. `/owner/auto-outreach/prospects` — find a fresh prospect.
3. On the detail page click **Run Full Pipeline** (or step through Scan →
   Generate → Send manually). When `TEST_MODE=1` the outreach is logged
   instead of sent so you can review the AI-personalized message first.
4. Click **Preview** to see the generated site. Share the URL with the
   prospect — when they click "Claim this site" they land in Stripe
   Checkout and the dashboard updates to `converted`.
