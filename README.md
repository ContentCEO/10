# HomeCare Club

A subscription SaaS for handyman / home-maintenance businesses. Customers buy a
recurring monthly membership for routine maintenance and submit on-demand
service requests; the business owner manages plans, jobs, payments, reminders,
and invoices from an admin dashboard.

Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase +
Stripe + Resend + Twilio**.

## Features

### Customer portal (`/portal`)
- Browse and subscribe to membership plans (Stripe Checkout, recurring billing)
- Manage billing via the Stripe Customer Portal
- Submit service requests with category, priority, preferred date, address
- See upcoming and past appointments
- View invoices and payment history
- Edit profile (used for SMS / email contact details)

### Admin dashboard (`/admin`)
- Overview KPIs: customers, active subscriptions, 30-day revenue, open requests
- Customers list with current subscription status
- Service requests queue with one-click scheduling into a job
- Jobs board with status transitions (scheduled → en route → in progress → completed)
- Plan management (create/edit, paste Stripe Price IDs)
- Payments ledger (populated by Stripe webhook)
- Invoice builder with line items, statuses (draft/open/paid/void)
- Maintenance reminders (one-off email/SMS) plus a cron endpoint that dispatches them

### Auth
- Supabase Auth (email + password) with role-aware redirects (admin vs. customer)
- Auto-provisioned `profiles` row via Postgres trigger
- Middleware-protected routes; RLS enforces per-row access in the database

### Integrations
- **Stripe**: Checkout for new subscriptions, Customer Portal for self-serve management,
  webhook (`/api/stripe/webhook`) syncs subscription state and writes payment rows.
- **Resend**: transactional email for service-request confirmations and reminders.
- **Twilio**: SMS reminders.
- **Cron**: `/api/cron/reminders` (POST or GET, secret-gated) dispatches due reminders.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 App Router, React 18, TypeScript |
| Styling | Tailwind CSS |
| Auth & DB | Supabase (Postgres + Row Level Security) |
| Billing | Stripe (Subscriptions, Customer Portal, Webhooks) |
| Email | Resend |
| SMS | Twilio |
| Validation | Zod |

## Getting started

### 1. Clone and install
```bash
npm install
```

### 2. Set up Supabase
1. Create a new project at <https://supabase.com>.
2. In the SQL editor, paste and run [`supabase/schema.sql`](supabase/schema.sql).
   This creates all tables, enums, the new-user trigger, RLS policies, and
   seeds three default plans.
3. Copy the project URL, anon key, and **service-role** key into `.env.local`.

### 3. Set up Stripe
1. In Stripe, create a recurring product/price for each plan and copy the
   `price_…` IDs.
2. Update each row in `plans` with its `stripe_price_id` (Admin → Plans, or via SQL).
3. Add your `STRIPE_SECRET_KEY` to `.env.local`.
4. For local webhook testing, run `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   and copy the printed secret to `STRIPE_WEBHOOK_SECRET`.

### 4. (Optional) Set up Resend and Twilio
- Add `RESEND_API_KEY` and `RESEND_FROM_EMAIL` for outbound email.
- Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` for SMS.
- Both are optional — if either is missing, the app degrades gracefully (logs a
  warning instead of failing the request).

### 5. Run it
```bash
cp .env.example .env.local   # then fill in the values
npm run dev
```
Open <http://localhost:3000>.

### 6. Make the first admin
Sign up via `/signup`, choose **Handyman business**. The new-user trigger seeds
your profile with the role you picked. (You can also flip an existing profile to
admin in Supabase: `update profiles set role = 'admin' where email = '…';`).

## Reminders cron

Schedule a `POST` (or `GET`) hit to `/api/cron/reminders` every few minutes. The
endpoint checks for any `maintenance_reminders` whose `send_at` is in the past
and dispatches them via the configured channels.

Authorization: pass `Authorization: Bearer $REMINDER_CRON_SECRET` or
`?token=$REMINDER_CRON_SECRET`. With Vercel Cron, drop this in `vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/reminders?token=YOUR_SECRET", "schedule": "*/15 * * * *" }] }
```

## Project structure

```
app/
  (public marketing) page.tsx, pricing/
  login/, signup/                # Supabase Auth flows
  dashboard/                     # role-based redirect
  admin/                         # business owner UI
  portal/                        # member UI
  api/
    auth/signout
    admin/{requests, jobs, plans, invoices, reminders}
    portal/{requests, profile}
    stripe/{checkout, portal, webhook}
    cron/reminders
components/                       # Shell, StatusBadge, SignOutButton
lib/
  supabase/{client,server,types}  # SSR-aware Supabase clients
  auth.ts                         # session/profile helpers + role guards
  stripe.ts notify.ts format.ts
middleware.ts                     # auth gating
supabase/schema.sql               # full schema + RLS + seeds
```

## Notes & limitations (MVP scope)

- Single-tenant: one handyman business per deployment.
- Email confirmation depends on your Supabase Auth settings; for local dev you
  may want to disable "Confirm email" so signups land you straight in.
- No file uploads on service requests yet (e.g., photos of the broken thing) —
  intentionally deferred.
- Job calendar is a simple list view, not a full calendar grid.
- Tax handling on invoices is stubbed at 0; wire up your jurisdiction logic before launch.
