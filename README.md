# ProposalPro AI

AI-powered proposal builder for contractors. Turn job notes, photos, and measurements into professional, itemized, client-ready proposals.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** for styling
- **Supabase** for auth, Postgres, and photo storage
- **Anthropic Claude** or **OpenAI GPT-4o** for proposal generation (toggle with `AI_PROVIDER`)
- **jsPDF + jspdf-autotable** for branded PDF export
- **Stripe** for subscription billing

## Features

- Email/password auth with Supabase
- Dashboard with all proposals, status, and pipeline value
- Create / edit proposals: client info, scope, measurements, materials, labor
- Upload site photos straight from a phone (Supabase Storage)
- One-click AI generation produces narrative, line items, payment schedule, timeline, and terms
- Inline-editable pricing table, payment schedule, and timeline
- Branded PDF export including photos page
- Stripe Checkout + Customer Portal billing, with webhook syncing plan to `profiles`
- Mobile-friendly responsive UI

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in env vars
npm run dev
```

### Environment variables

See `.env.example`. You'll need:

- A Supabase project (run `supabase/schema.sql` in the SQL editor)
- Either an Anthropic or OpenAI API key — set `AI_PROVIDER=anthropic` or `openai`
- A Stripe account with a Pro recurring price; set the price ID in `NEXT_PUBLIC_STRIPE_PRICE_PRO`
- A Stripe webhook pointed at `/api/stripe/webhook` with the secret in `STRIPE_WEBHOOK_SECRET`

### Supabase setup

1. Create a project on supabase.com.
2. Open the SQL editor and run `supabase/schema.sql`. This creates:
   - `profiles` and `proposals` tables with row-level security
   - A public `proposal-photos` storage bucket
   - A trigger that creates a `profiles` row on signup
3. In Authentication → Providers, enable Email and (optionally) disable email confirmation for local dev.

### Stripe setup

1. Create a Product → recurring Price (e.g. $29/mo) and copy its price ID.
2. Add `NEXT_PUBLIC_STRIPE_PRICE_PRO` to your env.
3. For local webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and copy the whsec secret to `STRIPE_WEBHOOK_SECRET`.

## Routes

- `/` — landing page
- `/login`, `/signup`
- `/dashboard` — proposal list
- `/dashboard/billing` — manage subscription
- `/proposals/new` — create proposal
- `/proposals/[id]` — edit proposal
- `/api/proposals/generate` — AI generation
- `/api/proposals` / `/api/proposals/[id]` — CRUD
- `/api/stripe/checkout` / `/api/stripe/portal` / `/api/stripe/webhook`

## Security notes

- All proposal queries are scoped by `auth.uid()` via Supabase RLS.
- The webhook route uses the service-role key and is excluded from the auth middleware.
- Storage uploads are namespaced under `userId/...` paths.
