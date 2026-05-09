# LeadRevive AI

Recover old leads with AI-personalized SMS + email follow-ups.

MVP scope: **CSV upload → AI message generation → manual send** (SMS via Twilio, email via Resend), with status tracking, a campaign builder, analytics, and Stripe billing.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, RLS)
- Twilio (SMS), Resend (Email)
- Anthropic Claude (default) or OpenAI for message generation
- Stripe (subscriptions)

## Setup

1. **Install deps**
   ```bash
   npm install
   ```

2. **Copy env**
   ```bash
   cp .env.example .env.local
   ```
   Fill in Supabase, AI, Twilio, Resend, and Stripe keys. Either `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is required for AI generation.

3. **Run the database migration**
   In the Supabase SQL editor, run `supabase/migrations/0001_init.sql`. This creates the schema, RLS policies, and the `auth.users` → `workspaces` trigger that auto-provisions a workspace on signup.

4. **Run the app**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000.

5. **Stripe webhook (optional)**
   Point Stripe to `POST /api/stripe/webhook` and set `STRIPE_WEBHOOK_SECRET`.

## CSV format

Headers are auto-detected (case-insensitive). Recognized columns:

`first_name`, `last_name` (or `name`), `email`, `phone`, `company`, `notes`, `source`, `tags` (comma/semicolon separated).

A row must have either `email` or `phone` to be imported.

## App map

- `/` — landing
- `/login`, `/signup`
- `/dashboard` — pipeline summary
- `/leads` — list, filter, search
- `/leads/upload` — CSV import
- `/leads/[id]` — generate AI draft, edit, send SMS or email, status tracker, message history
- `/campaigns`, `/campaigns/new` — sequence builder
- `/analytics` — pipeline, send volume, reply / booking rate
- `/settings` — workspace name, business context, billing

## Notes

- Send is **manual** in the MVP (per spec). Campaign sequences and the message API are wired up to extend to scheduled sending later (e.g. via Supabase cron + a worker route).
- All multi-tenant data is isolated through RLS via the workspace owner.
- The AI prompt lives in `lib/ai.ts` — tune the system prompt to match your tone.
