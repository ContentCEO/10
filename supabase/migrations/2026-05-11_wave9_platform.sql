-- Wave 9: auto-bid, distribution rules, booking, push, agency, brand, inbound SMS
-- Run AFTER 2026-05-11_disputes_and_widgets.sql.

-- 1. Auto-bid rules — set criteria, the cron auto-claims qualifying leads
create table if not exists public.auto_bid_rules (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null default 'My auto-bid',
  is_active           boolean not null default true,
  -- Filters
  service_keywords    text[] not null default '{}',   -- match any keyword in service_type (lowercase)
  city_keywords       text[] not null default '{}',   -- match any keyword in city (lowercase)
  zips                text[] not null default '{}',   -- exact zip match
  min_ai_score        int not null default 50 check (min_ai_score between 0 and 100),
  max_price_cents     int not null default 5000,      -- per-lead cap
  daily_budget_cents  int not null default 10000,     -- spend cap per day
  daily_spent_cents   int not null default 0,
  daily_reset_at      date not null default current_date,
  total_claimed       int not null default 0,
  created_at          timestamptz not null default now()
);
create index if not exists auto_bid_rules_user_idx on public.auto_bid_rules(user_id);
create index if not exists auto_bid_rules_active_idx on public.auto_bid_rules(is_active) where is_active = true;

alter table public.auto_bid_rules enable row level security;
drop policy if exists "auto bid owner all" on public.auto_bid_rules;
create policy "auto bid owner all" on public.auto_bid_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2. Lead distribution rules — at platform level, routes incoming marketplace
-- leads to specific contractors first (e.g. exclusive partnership tier).
create table if not exists public.distribution_rules (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  name                text not null default 'My route',
  is_active           boolean not null default true,
  service_keywords    text[] not null default '{}',
  city_keywords       text[] not null default '{}',
  zips                text[] not null default '{}',
  hour_start          int not null default 0  check (hour_start between 0 and 23),
  hour_end            int not null default 23 check (hour_end between 0 and 23),
  priority            int not null default 100,        -- lower = first served
  created_at          timestamptz not null default now()
);
create index if not exists distribution_rules_active_idx on public.distribution_rules(priority) where is_active = true;

alter table public.distribution_rules enable row level security;
drop policy if exists "dist rules owner all" on public.distribution_rules;
create policy "dist rules owner all" on public.distribution_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Booking calendar — each contractor publishes availability slots; homeowners
-- self-book an estimate visit through a public page or embed iframe.
create table if not exists public.booking_slots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  booked_by   uuid references auth.users(id) on delete set null,  -- homeowner
  booked_at   timestamptz,
  customer_name  text,
  customer_phone text,
  customer_email text,
  notes       text,
  service_type text,
  created_at  timestamptz not null default now()
);
create index if not exists booking_slots_user_idx on public.booking_slots(user_id, start_at);
create index if not exists booking_slots_open_idx on public.booking_slots(start_at) where booked_at is null;

alter table public.booking_slots enable row level security;
drop policy if exists "slots owner all" on public.booking_slots;
create policy "slots owner all" on public.booking_slots
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Anyone authenticated can read open slots (for the booking page).
drop policy if exists "slots public read open" on public.booking_slots;
create policy "slots public read open" on public.booking_slots
  for select using (booked_at is null);

-- 4. Push notification subscriptions (PWA)
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  unique (user_id, endpoint)
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;
drop policy if exists "push subs owner all" on public.push_subscriptions;
create policy "push subs owner all" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 5. Agency multi-account — agency users can manage many contractors
alter table public.profiles
  drop constraint if exists profiles_account_type_check;
alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('homeowner', 'contractor', 'employee', 'agency'));

create table if not exists public.agency_links (
  id             uuid primary key default gen_random_uuid(),
  agency_id      uuid not null references auth.users(id) on delete cascade,
  contractor_id  uuid not null references auth.users(id) on delete cascade,
  role           text not null default 'manager',
  created_at     timestamptz not null default now(),
  unique (agency_id, contractor_id)
);
create index if not exists agency_links_agency_idx on public.agency_links(agency_id);

alter table public.agency_links enable row level security;
drop policy if exists "agency links agency read" on public.agency_links;
create policy "agency links agency read" on public.agency_links
  for select using (auth.uid() = agency_id);
drop policy if exists "agency links contractor read" on public.agency_links;
create policy "agency links contractor read" on public.agency_links
  for select using (auth.uid() = contractor_id);
drop policy if exists "agency links agency write" on public.agency_links;
create policy "agency links agency write" on public.agency_links
  for all using (auth.uid() = agency_id) with check (auth.uid() = agency_id);

-- 6. White-label brand settings on profiles
alter table public.profiles
  add column if not exists brand_primary_color text,    -- hex e.g. '#6366f1'
  add column if not exists brand_accent_color  text,
  add column if not exists brand_logo_url      text,
  add column if not exists brand_custom_domain text;     -- e.g. 'reno.yourdomain.com' — DNS docs

-- 7. Inbound SMS conversations (Twilio webhook target)
create table if not exists public.inbound_messages (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,  -- nullable until matched
  from_phone   text not null,
  to_phone     text,
  body         text not null,
  twilio_sid   text unique,
  matched_lead_id uuid references public.leads(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists inbound_messages_user_idx on public.inbound_messages(user_id, created_at desc);
create index if not exists inbound_messages_phone_idx on public.inbound_messages(from_phone);

alter table public.inbound_messages enable row level security;
drop policy if exists "inbound msgs owner read" on public.inbound_messages;
create policy "inbound msgs owner read" on public.inbound_messages
  for select using (auth.uid() = user_id);
