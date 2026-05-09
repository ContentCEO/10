-- CallBack AI — initial schema
-- Run via Supabase SQL editor or the supabase CLI.

create extension if not exists "pgcrypto";

-- Businesses (one per user for MVP, but modeled 1:N for future flexibility)
create table if not exists public.businesses (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  industry        text,
  description     text,
  hours           text,
  service_area    text,
  booking_url     text,
  twilio_number   text unique,
  ai_persona      text default 'A friendly receptionist who qualifies leads quickly and books appointments.',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists businesses_owner_idx on public.businesses(owner_id);

-- Leads (one per phone number per business)
create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  phone           text not null,
  name            text,
  status          text not null default 'new'
                    check (status in ('new','contacted','qualifying','booked','won','lost','spam')),
  source          text default 'missed_call',
  notes           text,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  unique (business_id, phone)
);

create index if not exists leads_business_idx on public.leads(business_id);
create index if not exists leads_status_idx on public.leads(business_id, status);

-- Calls (record of inbound calls, missed or answered)
create table if not exists public.calls (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  lead_id         uuid references public.leads(id) on delete set null,
  twilio_call_sid text unique,
  from_number     text not null,
  to_number       text not null,
  status          text not null,           -- e.g. 'no-answer', 'completed', 'busy', 'failed'
  duration_sec    int,
  was_missed      boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists calls_business_idx on public.calls(business_id, created_at desc);

-- Messages (SMS, both directions)
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  direction       text not null check (direction in ('inbound','outbound')),
  body            text not null,
  twilio_sid      text unique,
  ai_generated    boolean not null default false,
  status          text default 'queued',   -- queued | sent | delivered | failed | received
  error           text,
  created_at      timestamptz not null default now()
);

create index if not exists messages_lead_idx on public.messages(lead_id, created_at);
create index if not exists messages_business_idx on public.messages(business_id, created_at desc);

-- Appointments (booked through the AI conversation)
create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  lead_id         uuid not null references public.leads(id) on delete cascade,
  scheduled_at    timestamptz,
  notes           text,
  status          text not null default 'pending'
                    check (status in ('pending','confirmed','completed','cancelled','no_show')),
  created_at      timestamptz not null default now()
);

create index if not exists appointments_business_idx on public.appointments(business_id, scheduled_at);

-- Notifications (in-app)
create table if not exists public.notifications (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses(id) on delete cascade,
  kind            text not null,            -- 'missed_call' | 'lead_reply' | 'appointment_booked'
  title           text not null,
  body            text,
  lead_id         uuid references public.leads(id) on delete set null,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists notifications_business_idx on public.notifications(business_id, created_at desc);

-- Subscriptions (Stripe)
create table if not exists public.subscriptions (
  id                      uuid primary key default gen_random_uuid(),
  owner_id                uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  price_id                text,
  status                  text,
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Update timestamp triggers
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_businesses_updated on public.businesses;
create trigger trg_businesses_updated before update on public.businesses
  for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- Row level security
alter table public.businesses    enable row level security;
alter table public.leads         enable row level security;
alter table public.calls         enable row level security;
alter table public.messages      enable row level security;
alter table public.appointments  enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;

-- Owners can see their own businesses
drop policy if exists "businesses_owner_rw" on public.businesses;
create policy "businesses_owner_rw" on public.businesses
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Helper: a business belongs to the current user
create or replace function public.is_business_owner(b uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.businesses where id = b and owner_id = auth.uid());
$$;

drop policy if exists "leads_owner_rw" on public.leads;
create policy "leads_owner_rw" on public.leads
  for all using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

drop policy if exists "calls_owner_rw" on public.calls;
create policy "calls_owner_rw" on public.calls
  for all using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

drop policy if exists "messages_owner_rw" on public.messages;
create policy "messages_owner_rw" on public.messages
  for all using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

drop policy if exists "appointments_owner_rw" on public.appointments;
create policy "appointments_owner_rw" on public.appointments
  for all using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

drop policy if exists "notifications_owner_rw" on public.notifications;
create policy "notifications_owner_rw" on public.notifications
  for all using (public.is_business_owner(business_id))
  with check (public.is_business_owner(business_id));

drop policy if exists "subscriptions_owner_rw" on public.subscriptions;
create policy "subscriptions_owner_rw" on public.subscriptions
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Note: webhook routes use the service_role key, which bypasses RLS.
