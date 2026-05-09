# AIStaffer

Hire AI employees — receptionist, sales rep, estimator, support — that answer
questions, qualify leads, and book next steps for your business 24/7.

This release ships the **AI Receptionist for contractors** as the first
persona. The rest of the roles are wired in the data model and UI as
"coming soon".

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind CSS**
- **Supabase** — Postgres, auth, RLS-scoped multi-tenant data
- **Anthropic Claude** (default) or **OpenAI** for chat + lead qualification
- **Stripe** — subscription billing (Starter / Pro)
- Embeddable JS widget for any website

## Project layout

```
app/
  (auth)/login, signup            # Auth pages
  (dashboard)/                    # Authed app (RLS-scoped)
    dashboard/                    # Overview
    employees/                    # CRUD + creation wizard
    conversations/                # Read transcripts
    leads/                        # Inbox of captured leads
    billing/                      # Stripe checkout + plan
    settings/
  chat/[slug]/                    # Public hosted chat page
  widget/[slug]/                  # Iframe-embedded widget chat
  widget-loader.js/               # The /widget-loader.js script that hosts inject
  api/
    chat/                         # POST: send message, get reply, persist + qualify
    leads/                        # POST: static lead form submissions
    stripe/checkout, webhook
components/                       # Sidebar, ChatInterface, LeadForm, EmployeeWizard, ...
lib/
  supabase/                       # Browser + server + service clients
  ai/                             # Provider abstraction + prompt assembly
  auth.ts                         # requireUser / requireOrg
  stripe.ts                       # Stripe singleton + plan map
  types.ts                        # Domain types
supabase/migrations/              # Initial schema (RLS policies included)
middleware.ts                     # Auth-gated routes + session refresh
```

## Setup

1. **Install deps**
   ```bash
   npm install
   ```

2. **Supabase**
   - Create a Supabase project.
   - In SQL editor, run `supabase/migrations/0001_initial_schema.sql`.
   - In Auth → Providers, enable Email (and confirm email setting per your
     preference).
   - Copy your **Project URL**, **anon key**, and **service role key**.

3. **AI provider** — pick one (or set both, choose with `AI_PROVIDER`):
   - Anthropic: set `ANTHROPIC_API_KEY` (default model `claude-sonnet-4-6`).
   - OpenAI: set `OPENAI_API_KEY` (default `gpt-4o-mini`).

4. **Stripe** (optional for local dev; required for billing):
   - Create two recurring **Prices** (Starter and Pro) in your Stripe
     dashboard, copy the IDs into `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO`.
   - Set `STRIPE_SECRET_KEY`.
   - For the webhook locally:
     ```bash
     stripe listen --forward-to localhost:3000/api/stripe/webhook
     ```
     Copy the resulting `whsec_…` into `STRIPE_WEBHOOK_SECRET`.

5. **Env**
   ```bash
   cp .env.example .env.local
   # fill in the values
   ```

6. **Run**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000.

## How it works

- **Workspace-per-signup**: on first dashboard load, an `organizations` row
  is created (1:1 with the auth user — `organizations.owner_id`). All other
  tables FK to the org so RLS keeps tenants isolated.
- **AI Employee** holds the role + business profile + structured knowledge
  (services / pricing / FAQs / policies). The system prompt is assembled
  from these on each chat request (`lib/ai/prompts.ts`).
- **Public chat** at `/chat/<slug>` and the iframe at `/widget/<slug>` both
  POST to `/api/chat`. That route uses the **service-role** Supabase client
  (anonymous visitors don't have a JWT), so it bypasses RLS — the trust
  boundary is the `is_published = true` check on the slug.
- **Lead capture**: after every assistant turn, the API runs a second,
  zero-temperature model call against the transcript with a strict-JSON
  qualifier prompt. If `is_lead=true`, it upserts a `leads` row tied to the
  conversation. Failures are swallowed so chat is never blocked.
- **Embed**: a host pastes
  ```html
  <script async src="https://YOUR_HOST/widget-loader.js"
          data-aistaffer="<slug>" data-color="#0070c4"></script>
  ```
  The loader appends a floating button + an iframe pointing at
  `/widget/<slug>`.

## Adding a new AI employee role

1. Add the role string to the `role` enum in
   `supabase/migrations/0001_initial_schema.sql` (and migrate).
2. Add the persona description in `ROLE_PERSONAS` in
   `lib/ai/prompts.ts`.
3. Mark it `available: true` in `components/EmployeeWizard.tsx`.

## Roadmap

- Editor for an existing employee (today the wizard is create-only)
- Per-employee usage limits + plan gating
- Streaming chat responses (replace `chatComplete` with a streamed call)
- SMS / phone (Twilio) channel
- Outbound followups for the Sales rep persona
