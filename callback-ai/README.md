# CallBack AI

Auto-text leads back after every missed call.

CallBack AI is a SaaS for local service businesses (HVAC, plumbing, salons, dentists,
etc.) that automatically replies via SMS to missed calls, qualifies the lead with an
AI conversation, and shares a booking link.

## Stack

- **Next.js 14** (App Router, Server Actions, Route Handlers)
- **TypeScript + Tailwind CSS**
- **Supabase** (Postgres, Auth, RLS)
- **Twilio** (Programmable Voice + Messaging webhooks)
- **Anthropic Claude** (Haiku 4.5) for SMS reply generation
- **Stripe** (subscription billing + customer portal)

## MVP scope

The MVP focuses on the critical path: **missed call → AI SMS → conversation → booking**.

- Owner signs up and creates a business profile
- Twilio number is pointed at the app's webhooks
- When a call goes unanswered → an AI-generated SMS goes out within seconds
- Inbound SMS replies stream into the same conversation; the AI keeps qualifying
- Dashboard shows leads, full conversation history, recent activity, and 30-day stats
- Stripe Checkout + customer portal for paid plans

## Getting started

### 1. Install

```bash
cd callback-ai
npm install
```

### 2. Configure Supabase

1. Create a project on [supabase.com](https://supabase.com).
2. In the SQL editor, paste & run `supabase/migrations/0001_init.sql`.
3. Copy the project URL, anon key, and service-role key into `.env.local`.

### 3. Configure Twilio

1. Buy a phone number with Voice + SMS capabilities.
2. In **Phone Numbers → Active Numbers → \<your number\>**:
   - **Voice & Fax → A CALL COMES IN** → `https://<your-domain>/api/twilio/voice` (HTTP POST)
   - **Voice & Fax → Call status changes** → `https://<your-domain>/api/twilio/voice-status` (HTTP POST, events: completed)
   - **Messaging → A MESSAGE COMES IN** → `https://<your-domain>/api/twilio/sms` (HTTP POST)
3. Copy `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` into `.env.local`.
4. (Optional) Create a Messaging Service for better deliverability and set
   `TWILIO_MESSAGING_SERVICE_SID`.

### 4. Configure AI + Stripe

- `ANTHROPIC_API_KEY` — Claude API key (uses `claude-haiku-4-5`).
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` — for checkout.
- `STRIPE_WEBHOOK_SECRET` — set after running `stripe listen --forward-to localhost:3000/api/stripe/webhook` (or via the Stripe dashboard).

### 5. Run

```bash
cp .env.example .env.local
# fill in the values
npm run dev
```

Open http://localhost:3000, sign up, fill in your business profile, paste your
Twilio number, and the webhook URLs from the **Settings** page into Twilio.

For local Twilio testing, expose your dev server with `ngrok http 3000` and use the
public URL as your `NEXT_PUBLIC_SITE_URL` and Twilio webhook host.

## Project layout

```
src/
  app/
    page.tsx                       Landing page
    login/, signup/                Supabase email/password auth
    dashboard/
      layout.tsx                   Auth-gated shell + nav
      page.tsx                     Overview & analytics
      business/                    Business profile setup
      leads/                       Lead inbox + per-lead conversation
      billing/                     Stripe subscription
      settings/                    Webhook URLs
    api/
      twilio/voice/                Inbound call webhook (TwiML)
      twilio/voice-status/         Call status callback (triggers AI SMS on miss)
      twilio/sms/                  Inbound SMS webhook (AI reply via TwiML)
      stripe/checkout/             Create Checkout Session
      stripe/portal/               Customer portal
      stripe/webhook/              Subscription state sync
      auth/signout/                Sign out
  lib/
    env.ts                         Typed env access
    supabase/{client,server}.ts    SSR + service-role clients
    twilio.ts                      Client, send SMS, signature verify
    ai/index.ts                    Claude prompt + reply generator
    leads.ts                       Lead/message persistence helpers
    phone.ts                       E.164 normalization
    stripe.ts                      Stripe client
supabase/migrations/0001_init.sql  Schema + RLS policies
```

## How the missed-call flow works

1. Caller dials the business's Twilio number.
2. Twilio POSTs to `/api/twilio/voice` → we record the call ringing, return TwiML
   that politely tells the caller we'll text them right back.
3. After hangup, Twilio POSTs to `/api/twilio/voice-status` with `CallStatus`.
4. If the status is `no-answer`, `busy`, `failed`, or a sub-5-second `completed`,
   we treat it as a missed call.
5. We find/create the lead, build a conversation history, and ask Claude for an
   SMS reply tailored to the business profile.
6. We send the SMS via Twilio and persist both directions of the message.
7. Subsequent inbound SMS hits `/api/twilio/sms`; the AI keeps the conversation
   going one short message at a time, sharing the booking URL when ready.

## Security

- Twilio webhooks verify the `X-Twilio-Signature` header against the request body
  (see `src/lib/twilio.ts`). In dev you can set `WEBHOOK_VERIFY_SIGNATURES=false`.
- Stripe webhooks verify the `Stripe-Signature` header.
- Supabase RLS scopes all per-business reads/writes to the authenticated owner.
  Webhook routes use the service-role key (bypass RLS) and validate ownership via
  the `businesses.twilio_number` lookup.

## Roadmap (not in MVP)

- Twilio number provisioning from the dashboard
- Multi-business / team accounts
- Custom call forwarding before fallback to SMS
- Calendar integration (Google / Cal.com) for true 1-tap booking
- AI-detected appointment intent → auto-create `appointments` rows
- Web push / email notifications
