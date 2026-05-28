# Contractor Flow — Architecture

ProPresenter-style: one customer app, multiple unlock-able modules.
Plus a separate public marketing site.

## The 2 apps

### 1. Customer App (this repo)

`app.contractorflowstore.com` (or current contractorflowstore.com root for now)

One Next.js app, one login, one Stripe customer per user. Sidebar
items + routes show based on which modules the user has active
subscriptions for.

- **CRM module** (`cf-crm`): pipeline, leads, customers, jobs, invoices,
  proposals, marketing hub, content studio, ops, growth analytics.
  The base product.
- **Launchpad module** (`cf-launchpad`): agency-managed websites + ads
  for the contractor's own customer-facing site. (Coming.)
- **Marketplace module** (`cf-marketplace`): lead-gen scrapers (22 MA
  sources), BatchData phone enrichment, Lob auto-postcards, Meta Lead
  Ads webhook, Vapi voice receptionist, AI insights, scraper
  health/ROI dashboards. Plus the `/marketplace` UI where contractors
  buy claims to leads.
- **Academy** (`cf-academy`): training courses. (Future.)
- **Capital** (`cf-capital`): invoice factoring. (Future.)

Module visibility is gated by `src/lib/subscriptions.ts` → `getUserModules()`.
Owner email gets all modules automatically. Admins get CRM + Marketplace
by default. Future: real lookup against a `subscriptions` table when
Stripe products are wired.

### 2. Public Marketing Site (separate repo, future build)

`contractorflowstore.com` (root)

Static + light-server Next.js site for non-customers. No login.

- Landing page
- `/quote/[trade]` — homeowner cost calculator (11 trades)
- `/for-pros/[trade]` — trade-pro recruitment funnels (12 trades)
- `/find-pro` — homeowner contractor search
- `/local/[service]/[city]` — programmatic SEO
- `/pros/[id]` — public contractor profiles
- `/cost-calculator`, `/embed/quote`
- `/book/[id]`, `/l/[id]`, `/p/[token]`, `/r/[code]`, `/yard/[id]`,
  `/permits/[city]`, `/tools/estimate`

Form submissions POST cross-origin to the customer app's
`/api/marketplace/intake` (with proper CORS).

Currently these routes still live in the customer app (this repo)
until the public-site extraction is done in a follow-up.

## Shared infrastructure

- **Single Supabase project** — all tables shared across apps.
- **Single Stripe customer per user** — multiple products tagged per
  module.
- **Single auth** — Supabase cookie scoped to `.contractorflowstore.com`
  so a sign-in on the customer app persists to the public site (when
  the user wants to log in).

## Why this beats both extremes

**vs. 3 separate apps:** customer has one login + one bookmark, sees
their stuff in one place. New module = it just appears in the
sidebar, no new URL to learn. Easier to upsell from inside the app.
ProPresenter, HubSpot, Square, Shopify all do this.

**vs. monolith for everything:** the public marketing pages have a
totally different audience (homeowners + SEO), don't need auth, and
benefit from being on their own domain root for ad attribution and
indexing. Keeping them in the customer app makes the build slower
and conflates two products.

## Module activation flow

1. Contractor signs up → has `cf-crm` automatically (free trial or paid).
2. They use the CRM for a few months.
3. They see "Unlock Marketplace — get leads sent to your inbox" card
   in the sidebar or on the dashboard.
4. Click → Stripe checkout for the Marketplace tier.
5. On webhook, insert a row into `subscriptions` with
   `sub_brand="cf-marketplace"` and `status="active"`.
6. Next page reload: `/marketplace` and `/owner/scrapers` (and the
   rest) appear in the sidebar.
7. They never left the app.

Same flow for Launchpad later.
