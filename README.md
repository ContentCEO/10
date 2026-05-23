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

## Contractor Flow Launchpad

The agency sub-brand under the **Contractor Flow** umbrella. Builds custom
websites + runs Google/Meta ads for home-services contractors. Per the
[Contractor Flow architecture brief](#), Launchpad is sub-brand #2 (CRM is #1)
and lives at `/owner/launchpad` (ops console, owner-only) plus
`preview.contractorflow.com/[slug]` (public per-prospect previews).

**Visual identity**: inherits the Contractor Flow logo + layout, accent color
rust orange `#C44A26` on primary CTAs, sub-brand badges, and section headers.

**Pipeline**

1. **Discover** — Google Places (New) text search by city + trade. Falls back
   to synthetic demo data if `GOOGLE_PLACES_API_KEY` isn't set.
2. **Scan** — Fetch the prospect's existing site, heuristically score
   speed/design/SEO/conversion, benchmark against 3 local competitors, and
   ask Claude for a plain-English audit (weaknesses + opportunities).
3. **Generate** — Claude builds a complete `SiteContent` payload (hero copy,
   services, about, reviews, FAQ, theme colors, SEO) plus per-platform ad
   strategies with realistic budgets, keywords, CPLs, and ad copy variants.
4. **Outreach** — AI-personalized email / SMS signed as "Davi at Contractor
   Flow Launchpad" that references one specific scan finding and links to
   the live preview. Uses shared `src/lib/messaging.ts` (Resend + Twilio,
   respects `TEST_MODE`).
5. **Claim** — Prospect clicks "Claim this site" → Stripe Checkout for one
   of the three exact tiers from the brief Section 5:

   | Tier | Setup | Recurring | Commitment |
   | --- | --- | --- | --- |
   | **Foundation** | $1,997 one-time | — | none |
   | **Foundation + Growth** *(recommended)* | $997 | $997/mo | 6-month min |
   | **Revenue Share** | $497 | $497/mo + 8% of attributed revenue | 12-month min |

   Webhook flips the prospect to `converted` and stores the subscription.

**Per-prospect preview URLs**: `preview.contractorflow.com/{slug}`. The
middleware rewrites that single dedicated subdomain to the internal
`/preview/sites/{slug}` route. No per-site deploy — every preview is one
Next.js app reading `cf_launchpad_sites.content` (JSONB) by slug.

**Module layout**

```
src/lib/launchpad/
  types.ts          shared types (Plan = foundation | foundation_growth | revenue_share)
  places.ts         Google Places + synthetic fallback
  scanner.ts        website fetch + heuristic scoring + Claude audit
  generator.ts      Claude site-content generator + slug
  ads.ts            Claude Google + Meta strategy generator
  outreach.ts       AI personalization (Davi voice) + send + log
  pipeline.ts       end-to-end orchestrator + buildPreviewUrl
  auth.ts           owner-only API gate

src/app/api/launchpad/
  discover/                   POST  Places search → insert prospects
  scan/                       POST  scan + audit one prospect
  generate/                   POST  generate site + ad strategies
  outreach/                   POST  send one email or SMS
  pipeline/                   POST  scan → generate → outreach in one call
  claim/                      POST  PUBLIC — start Stripe checkout (3 tiers)
  stripe-webhook/             POST  PUBLIC — handle checkout.session.completed
  track/[id]/                 GET   PUBLIC — email open pixel
  unsubscribe/                GET   PUBLIC — opt-out link

src/app/(app)/owner/launchpad/
  page.tsx                    ops dashboard (stats + recent activity)
  prospects/                  filterable prospect list
  prospects/[id]/             full detail + action buttons
  discover/                   start a new Places search
  campaigns/                  reusable message templates

src/app/preview/sites/
  layout.tsx                  bare layout for public previews
  [slug]/page.tsx             public landing page (loaded from cf_launchpad_sites by slug)
  [slug]/template-classic-hero.tsx   the rendered template (CF logo + Launchpad badge top-left)
  [slug]/claim/               three-tier pricing + Stripe checkout
  [slug]/thanks/              post-claim thank you

supabase/migrations/
  2026-05-23_cf_launchpad.sql  cf_launchpad_{prospects,scans,sites,ad_strategies,
                                              campaigns,outreach_log,subscriptions}
```

**Stripe products** (create with these exact IDs per brief Section 7):

```
cf_launchpad_foundation                  one-time   $1,997
cf_launchpad_foundation_growth_setup     one-time   $997
cf_launchpad_foundation_growth_monthly   recurring  $997/mo
cf_launchpad_revenue_share_setup         one-time   $497
cf_launchpad_revenue_share_monthly       recurring  $497/mo
cf_launchpad_revenue_share_8pct          metered    8% of attributed revenue
                                                    (invoiced out-of-band via
                                                    CF CRM attribution)
```

**Required env vars** (see `.env.example`)

| Var | Purpose |
| --- | --- |
| `GOOGLE_PLACES_API_KEY` | Real prospect discovery. Optional — falls back to synthetic data. |
| `NEXT_PUBLIC_LAUNCHPAD_PREVIEW_DOMAIN` | Dedicated preview subdomain (e.g. `preview.contractorflow.com`). Optional — falls back to `/preview/sites/[slug]` on the main domain. |
| `STRIPE_PRICE_CF_LAUNCHPAD_FOUNDATION` | Tier 1 one-time price ID. |
| `STRIPE_PRICE_CF_LAUNCHPAD_FOUNDATION_GROWTH_SETUP` / `_MONTHLY` | Tier 2 setup + recurring. |
| `STRIPE_PRICE_CF_LAUNCHPAD_REVENUE_SHARE_SETUP` / `_MONTHLY` | Tier 3 setup + recurring. |
| `ANTHROPIC_API_KEY` | Already wired (`src/lib/ai.ts`) — used for audit, site, ads, message personalization. |
| `RESEND_API_KEY` + `RESEND_FROM_EMAIL` | Outbound cold email. |
| `TWILIO_*` | Outbound SMS. |
| `TEST_MODE=1` | Logs sends instead of delivering — safe for first runs. |

**Operator workflow**

1. `/owner/launchpad/discover` — enter trade + city → click discover.
2. `/owner/launchpad/prospects` — find a fresh prospect.
3. On the detail page click **Run Full Pipeline** (or step through Scan →
   Generate → Send manually). When `TEST_MODE=1` the outreach is logged
   instead of sent so you can review the AI-personalized message first.
4. Click **Preview** to see the generated site. Share the URL with the
   prospect — when they click "Claim this site" they land in Stripe
   Checkout with all three Launchpad tiers and the dashboard updates to
   `converted` after payment.

### Future scope (per architecture brief Section 4)

- **Unified User + Subscription tables**: cross-sub-brand. Today CRM and
  Launchpad each have their own slice; per brief, contractors must have ONE
  Contractor Flow account that holds Subscriptions across all sub-brands
  (`cf-crm`, `cf-launchpad`, `cf-marketplace`, `cf-academy`, `cf-capital`).
  When the unified `subscriptions` table lands, the Stripe webhook here
  should also write into it (with `sub_brand='cf-launchpad'`) so billing
  rolls up across the portfolio.
- **Customer-facing Launchpad portal** at `/launchpad` (subscription-gated):
  the contractor sees their own website + ad campaigns + monthly report.
  Today only the operator (Davi) sees Launchpad — at `/owner/launchpad`.
- **Cross-sell trigger**: when a Launchpad client's CF CRM trial ends at
  month 6 (Foundation+Growth) or month 1 (Foundation), auto-convert to paid
  CRM at $79/mo. Currently captured in the brief but not yet wired.
- **8% revenue-share metering**: revenue attribution from CF CRM lead source
  tags → Stripe `cf_launchpad_revenue_share_8pct` metered usage records,
  billed at end of month. Wire when the first Revenue Share tier client
  signs.
