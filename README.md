# ContractorClose AI

AI sales coach for home-improvement and trade contractors. Paste a sales call
transcript, get a 1-100 score, missed-opportunity breakdown, objection
responses, follow-up email + SMS, and a close-probability estimate. Track your
average score and improvement over time.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** (auth, Postgres, RLS)
- **Anthropic Claude** (`claude-sonnet-4-6` by default) for analysis
- **Stripe** subscription billing

## Features

- Email/password auth (Supabase)
- Paste-transcript flow with AI sales-call analysis
  - Overall call score (1-100)
  - Close probability (0-100%)
  - Strengths, missed opportunities (with better responses)
  - Objection-by-objection breakdown
  - Auto-drafted follow-up **email** and **SMS**
  - Concrete next steps
- Dashboard with average score, recent calls, and improvement trend chart
- AI sales-script generator with personal saved library
- Objection-handling workbench with personal saved library
- Stripe-powered Pro plan (subscription) and webhook-driven plan flag

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-4-6

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PRICE_ID=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set up the database

In your Supabase project, open the SQL editor and run
[`supabase/schema.sql`](./supabase/schema.sql). It creates the `profiles`,
`calls`, `scripts`, and `objections` tables, the `handle_new_user` trigger,
and Row Level Security policies that make every row owner-scoped.

### 4. Stripe

1. Create a recurring product/price in Stripe and put the price ID in
   `NEXT_PUBLIC_STRIPE_PRICE_ID`.
2. Add a webhook endpoint pointing at `/api/stripe/webhook` and put the
   signing secret in `STRIPE_WEBHOOK_SECRET`. The webhook upgrades the user's
   `profiles.plan` to `pro` on subscription creation/renewal and back to
   `free` on cancellation.

### 5. Run

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Project layout

```
app/
  page.tsx                 # marketing landing page
  login/                   # auth pages
  signup/
  dashboard/               # average score, trend chart, recent calls
  analyze/                 # paste transcript + result viewer
  scripts/                 # AI script generator + saved scripts
  objections/              # objection workbench + saved library
  billing/                 # plan + Stripe checkout entry
  api/
    analyze/route.ts       # AI call analysis endpoint
    scripts/route.ts       # AI script generator endpoint
    objections/route.ts    # AI objection-response endpoint
    stripe/
      checkout/route.ts    # creates Stripe Checkout session
      webhook/route.ts     # updates profiles.plan from Stripe events
components/                # shared UI (nav, score ring, trend chart, etc.)
lib/
  ai/anthropic.ts          # Claude client + JSON parser
  ai/prompts.ts            # system + user prompts
  supabase/                # browser, server, middleware, admin clients
  stripe.ts
  types.ts
middleware.ts              # auth-gate /dashboard, /analyze, /scripts, /objections, /billing
supabase/schema.sql        # full schema with RLS
```

## Notes on the AI

- All prompts return strict JSON. `lib/ai/anthropic.ts` will recover from
  fenced code blocks and surrounding prose if the model ever wraps its output.
- The system prompt is tuned for trade contractors specifically — it
  understands roofing/HVAC/remodel objections like "I need to talk to my
  spouse" or "I'm getting other quotes."
- Default model is `claude-sonnet-4-6`; override via `ANTHROPIC_MODEL`.
