# Contractor Flow Launchpad

Coming-soon placeholder + waitlist. Deploys to `launchpad.contractorflowstore.com`.

## Local dev

```bash
npm install
npm run dev   # :3000
```

## Deploy (Vercel)

1. Create a new Vercel project, point it at `launchpad-app/` (or push as standalone repo)
2. No env vars required for the placeholder
3. Custom domain: `launchpad.contractorflowstore.com` → CNAME → `cname.vercel-dns.com.`

## What this is

Single page with:
- Hero: "We're building Launchpad. Opens Q1 2027."
- Email waitlist form POST → `https://contractorflowstore.com/api/waitlist`
- 3 feature pillars
- Links back to live products (Marketplace, CRM)

Full Launchpad app (website tracking, ads dashboard, monthly reports, messaging) ships post-Marketplace launch.
