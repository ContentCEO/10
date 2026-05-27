# Contractor Flow Marketplace

Lead-gen engine + homeowner-facing capture pages + contractor marketplace.

Part of the Contractor Flow family of products:
- **Contractor Flow CRM** ([contractorflowstore.com](https://contractorflowstore.com)) — daily-driver pipeline for end-user contractors
- **Contractor Flow Marketplace** (this app) — lead-gen + marketplace
- **Contractor Flow Launchpad** — agency client management (separate repo)

## What this app contains

- **Lead-gen scrapers** — 22 MA-focused sources (permits, deeds, evictions, foreclosures, Reddit, Craigslist, NextDoor, Facebook groups, etc.)
- **Public capture pages** — `/quote/[trade]`, `/for-pros/[trade]`, `/local/[service]/[city]`, `/find-pro`, `/pros`
- **Marketplace UI** — `/marketplace` where contractors buy claims to leads
- **Owner tools** — `/owner/scrapers`, `/owner/lob-setup`, `/owner/meta-setup`, `/owner/vapi-setup`, `/owner/insights`, `/owner/lead-gen-roi`
- **Integrations** — BatchData phone enrichment, Lob auto-postcards, Meta Lead Ads webhook, Vapi voice receptionist, Twilio missed-call auto-text

## Local dev

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Anthropic + BatchData + Lob + Meta + Vapi keys
npm run dev
```

Opens at `http://localhost:3000`.

## Deploy

This app is designed to deploy at `marketplace.contractorflowstore.com`:

1. Create a new Vercel project pointing to this repo
2. Add the env vars from `.env.example`
3. Set the custom domain to `marketplace.contractorflowstore.com`
4. Vercel reads `vercel.json` and activates 22 cron schedules

## Shared with the CRM app

- **Supabase database** — single project. Tables: `leads`, `marketplace_leads`, `customers`, `profiles`, `scraper_runs`, etc.
- **Supabase auth** — set cookie domain to `.contractorflowstore.com` so login persists across subdomains
- **Stripe customer** — one customer per user, subscriptions tagged per sub-brand

## Env vars

See `.env.example`. Critical:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `ANTHROPIC_API_KEY`
- `CRON_SECRET` (must match the value Vercel uses for cron auth)
- `BATCHDATA_API_KEY`, `LOB_API_KEY`, `META_*`, `VAPI_*`
- `OWNER_EMAIL`, `OWNER_PHONE`
- `TEST_MODE=1` to log SMS/email instead of firing
