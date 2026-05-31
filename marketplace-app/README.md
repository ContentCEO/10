# Contractor Flow Marketplace

Public marketing site for the Contractor Flow family.

- **Homeowners**: free quotes via `/quote/[trade]`
- **Trade pros**: recruitment funnels at `/for-pros/[trade]`
- **SEO**: programmatic `/local/[service]/[city]` pages
- **Public capture forms**: `/l/[id]`, `/i/[id]`, `/p/[token]`, `/r/[code]`, `/yard/[id]`, `/book/[id]`
- **Cold-outreach mockups**: `/preview/[slug]`

The customer-facing CRM + admin tooling lives in the OTHER repo (contractor-flow-crm).

## Local dev

```bash
npm install
cp ../.env.example .env.local   # adjust paths for your environment
npm run dev   # opens on :3000
```

## Deploy

1. Create a new GitHub repo: `contractor-flow-marketplace`
2. `git init && git add . && git commit -m "init" && git remote add origin <new repo url> && git push -u origin main`
3. Create a new Vercel project pointing to that repo
4. Add env vars (same Supabase + ANTHROPIC_API_KEY as main app)
5. Custom domain: `marketplace.contractorflowstore.com` (or whatever subdomain)
6. Vercel auto-deploys

## Architecture

- Public-only — no auth, no signed-in state
- Form submissions POST to `/api/marketplace/intake` (lives in this app — shared Supabase DB with main)
- Single Supabase database shared with the customer app
- No crons here. All scrapers + AI run in the customer app.

## What's NOT here (lives in the customer app)

- `/marketplace` UI (the contractor-facing buy-a-lead page)
- `/owner/*` admin tools (scrapers, Lob setup, Meta setup, Vapi setup, insights, ROI)
- `/admin/*` (curation, marketplace firehose)
- All 33 cron jobs (scrapers, mirror, lob postcards, instant reply, etc.)
- BatchData enrichment, Vapi webhook, etc.

If you want to move scrapers/crons here later, you'll need to move the
relevant lib files (`lob.ts`, scraper routes, etc.) over too.
