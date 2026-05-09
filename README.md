# LocalContent AI

A SaaS app that auto-generates 30 days of social media content (Instagram captions,
TikTok / Reels ideas, before-and-after posts, promotional offers, hashtags, and image
prompts) for local businesses — built with Next.js 14, TypeScript, Tailwind, Supabase,
Stripe, and the Anthropic Claude API.

## Features

- Email + password auth via Supabase
- Business profile (type, services, city, brand tone, USPs)
- One-click 30-day content calendar (Generate page)
- Single-post generation for any of 6 content types
- Drafts page: edit status (draft / scheduled / published), set scheduled date, delete
- Calendar view with month navigation
- CSV export of all content
- Stripe billing (Pro plan + customer portal) with webhook-driven subscription state
- Optional image-prompt generator

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** (Auth + Postgres + RLS)
- **Anthropic Claude** (`claude-sonnet-4-6`) via `@anthropic-ai/sdk`
- **Stripe** subscriptions + billing portal

## Getting started

```bash
cp .env.example .env.local   # fill in Supabase, Stripe, Anthropic keys
npm install
npm run dev
```

Open http://localhost:3000.

### Supabase setup

1. Create a Supabase project.
2. In **SQL Editor**, paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) and run.
3. In **Auth → URL configuration**, add `http://localhost:3000/api/auth/callback` to redirect URLs.

### Stripe setup

1. Create a recurring price in Stripe and put the price id in `NEXT_PUBLIC_STRIPE_PRICE_ID`.
2. Run the webhook locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
3. Put the webhook secret in `STRIPE_WEBHOOK_SECRET`.

## Project structure

```
app/
  api/                  REST endpoints (generate, generate-month, export-csv, stripe)
  dashboard/            Authenticated app: generate, calendar, drafts, profile, billing
  login, signup         Auth pages
lib/
  claude.ts             Anthropic SDK wrapper
  prompts.ts            System + per-content-type prompts
  supabase/             Browser, server, and middleware Supabase clients
  stripe.ts, csv.ts     Stripe client + CSV serializer
supabase/schema.sql     Postgres schema with RLS
middleware.ts           Auth-aware route gating
```
