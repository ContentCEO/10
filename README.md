# AdForge AI

AI-powered ad generator for Meta / Facebook / Instagram. Plug in your business,
product, and offer, and AdForge AI returns hooks, headlines, primary text,
image prompts, video scripts, and a full campaign structure plan — ready to paste
into Ads Manager or hand to your media buyer.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS**
- **Supabase** (auth + Postgres + RLS)
- **Anthropic Claude** or **OpenAI** for generation
- **Stripe** for subscription billing

## Features

- Email/password auth (Supabase)
- Business profile setup (industry, audience, brand voice, UVP)
- Product / service input (features, benefits, pain points)
- Offer builder (headline, CTA, urgency, guarantee, bonus)
- AI generates 2–8 ad variants with distinct angles, each containing:
  - Hook
  - Headline
  - Primary text
  - Description
  - CTA
  - Image prompt
  - Video script (30-second UGC style)
- Campaign structure suggestions (objective, ad sets, audiences, placements, budget split, KPIs, testing plan)
- Save campaigns + creatives to your dashboard
- Export campaign creatives as CSV
- Stripe billing — Free / Starter / Pro plans, with monthly generation quotas

## Quick start

1. **Install**

   ```bash
   npm install
   ```

2. **Copy env vars**

   ```bash
   cp .env.example .env.local
   ```

   Fill in values (see below).

3. **Set up Supabase**
   - Create a Supabase project.
   - In the SQL editor, run `supabase/schema.sql`.
   - Copy the project URL, anon key, and service role key into `.env.local`.

4. **Configure an AI provider**
   - Set `ANTHROPIC_API_KEY` (recommended) or `OPENAI_API_KEY`.
   - Optional: `AI_PROVIDER=anthropic|openai`.

5. **Configure Stripe (optional for local dev)**
   - Create two recurring products in Stripe (Starter, Pro) and copy their price IDs into `STRIPE_PRICE_STARTER` and `STRIPE_PRICE_PRO`.
   - Set `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
   - For webhooks, run `stripe listen --forward-to localhost:3000/api/billing/webhook` and put the signing secret in `STRIPE_WEBHOOK_SECRET`.

6. **Run**

   ```bash
   npm run dev
   ```

   Open <http://localhost:3000>.

## Routes

- `/` — landing
- `/login`, `/signup` — auth
- `/onboarding` — business profile setup (first-run)
- `/generator` — product + offer + generate
- `/dashboard` — list of saved campaigns
- `/dashboard/campaigns/[id]` — campaign detail + CSV export
- `/business` — manage business profiles
- `/billing` — plans, checkout, customer portal

## API

| Method | Path | Purpose |
| ------ | ---- | ------- |
| POST | `/api/businesses` | Create business profile |
| PATCH | `/api/businesses/[id]` | Update business |
| POST | `/api/generate` | Generate ad creatives + campaign plan |
| POST | `/api/campaigns` | Save campaign + creatives |
| DELETE | `/api/campaigns/[id]` | Delete campaign |
| GET | `/api/campaigns/[id]/export` | Export creatives as CSV |
| POST | `/api/billing/checkout` | Stripe Checkout session |
| POST | `/api/billing/portal` | Stripe Customer Portal |
| POST | `/api/billing/webhook` | Stripe webhook |
| POST | `/api/auth/signout` | Sign out |

## MVP scope

This is a copy-and-plan generator — it does **not** post directly to Meta. Use
the CSV export or the per-field copy buttons to move creatives into Ads Manager.
Direct Meta posting is a planned follow-up.
