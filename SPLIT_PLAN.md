# Contractor Flow — App Split Plan

> This document tracks the migration of ContractorFlow from a monolithic
> Next.js app into three separate apps per the strategic architecture
> brief. We're on Phase 1: strip this repo down to the CRM (Contractor
> Flow CRM).

## What stays in this repo (`contractor-flow-crm`)

Daily-driver pipeline tool for contractor end-users. $49–$149/mo SaaS.

### Routes
- `/` (CRM marketing landing)
- `/dashboard`, `/leads/*`, `/customers/*`, `/jobs/*`
- `/invoices/*`, `/proposals/*`, `/calendar`, `/dispatch`
- `/pipeline`, `/inbox/*`, `/tasks`
- `/marketing-hub/*`, `/content-studio/*`
- `/team/*`, `/expenses`, `/equipment`, `/vendors`, `/subcontractors`
- `/grow/*` (analytics)
- `/preferences`, `/billing`, `/profile`, `/integrations`
- `/settings/*`, `/auth/*`, `/login`, `/signup`, `/download`
- `/(home)/home/*`, `/(home)/portal/*`, `/(employee)/work/*`, `/(agency)/*`

### Crons (CRM-specific)
- `appointment-reminders`, `late-invoice-reminders`
- `proposal-followups`, `auto-proposal-draft`
- `recurring-invoices`, `recurring-services`
- `job-completion-followups`, `job-cost-overrun`
- `lead-decay`, `lead-instant-reply`, `lead-ai-summary`
- `lead-intent-classify`, `lead-trade-classify`, `lead-spam-filter`
- `abandon-stale-leads`, `stale-lead-followup`
- `compliance-alerts`, `daily`, `daily-standup`
- `inbox-digest`, `nps-autosend`, `owner-digest`
- `reengagement`, `review-requests`, `webhook-notifications`
- `weekly-review`, `thank-you-notes`, `milestone-celebrations`
- `customer-anniversary`, `onboarding-sequence`, `emergency-alert`

### Lib
- `lib/types.ts`, `lib/owner.ts`, `lib/plans.ts`, `lib/audit.ts`, `lib/alerts.ts`
- `lib/lead-intake.ts`, `lib/lead-pricing.ts`, `lib/follow-up-sequence.ts`
- `lib/i18n.ts`, `lib/seo-seed.ts`, `lib/local-page.tsx`
- `lib/marketplace.ts` (types only, no marketplace UI)
- `lib/agents/*` (CRM-side agents)
- `lib/supabase/*`, `lib/ai.ts`, `lib/messaging.ts`
- `lib/cron-auth.ts`, `lib/wallet.ts`, `lib/push.ts`
- `lib/directory.ts`, `lib/drip-defaults.ts`

## What moves to `contractor-flow-marketplace` (new app)

Lead-gen engine + public capture + Davi's internal tools to manage it.

### Routes
- `/marketplace/*` (the buy-a-lead UI)
- `/find-pro/*` (homeowner search)
- `/pros/*` (contractor profiles for homeowners)
- `/quote/*` (cost-calculator capture pages, 11 trades)
- `/for-pros/*` (trade recruitment funnels, 12 trades)
- `/local/*` (programmatic SEO city × service pages)
- `/cost-calculator`, `/tools/estimate`, `/embed/quote`
- `/permits/[city]` (public permit feed pages)
- `/yard/[id]`, `/p/[token]`, `/r/[code]` (referral / yard sign / proposal sign)
- `/l/[id]`, `/i/[id]`, `/book/[id]` (public capture forms)
- `/(admin)/admin/curation`, `/(admin)/admin/marketplace`
- `/owner/scrapers`, `/owner/lob-setup`, `/owner/meta-setup`
- `/owner/vapi-setup`, `/owner/lead-gen-roi`, `/owner/insights`
- `/owner/setup-plan`

### API
- `/api/scrape/*` (22 scrapers)
- `/api/cron/mirror-marketplace`, `/api/cron/lob-postcard-blast`
- `/api/marketplace/*` (intake, claim, dispute, topup, meta, google-ads, auto-bid)
- `/api/voice/*` (Vapi inbound, missed-call, summarize)
- `/api/owner/scrapers/*`, `/api/owner/lob-test`, `/api/owner/batchdata-test`
- `/api/owner/wipe-scraped`
- `/api/admin/curation/*`
- `/api/public/capture/[id]`

### Lib
- `lib/lead-quality.ts`, `lib/trades.ts`, `lib/lob.ts`
- `lib/messaging.ts` (shared — also stays in CRM)
- `lib/marketplace.ts` (full — shared types + helpers)

### Crons
- `mirror-marketplace`, `lob-postcard-blast`
- All `/api/scrape/*` cron schedules

## What goes to `contractor-flow-launchpad` (greenfield)

Brand-new build. Agency-side tool for Davi to onboard + manage agency clients.

- Client intake form
- Mockup builder (`preview.contractorflowstore.com/[slug]`)
- Contract signing
- Kickoff workflow
- Monthly client reports
- Ad budget tracking
- Revenue-share attribution

Nothing to extract from this repo — built fresh.

## Migration order

1. **Phase 1 (this PR):** Move marketplace files to `_extract_marketplace/` in this repo.
   Replace public routes (`/quote`, `/for-pros`, `/marketplace`) with redirect stubs to a
   "coming soon at marketplace.contractorflowstore.com" page. CRM build still passes.
2. **Phase 2 (separate session):** Create new `contractor-flow-marketplace` GitHub repo +
   Vercel project. Push the contents of `_extract_marketplace/` to it. Deploy to
   `marketplace.contractorflowstore.com`. Once live, swap redirect targets in CRM.
3. **Phase 3 (separate session):** Scaffold greenfield `contractor-flow-launchpad` repo.

## Shared resources (no copy needed)

- **Supabase database**: all three apps connect to the same project. Tables stay
  where they are. RLS policies cover who can see what.
- **Stripe customer**: one Stripe customer per user, multiple subscriptions across apps.
- **Auth**: shared via Supabase. Cookie domain set to `.contractorflowstore.com` so
  login persists across all three subdomains.
