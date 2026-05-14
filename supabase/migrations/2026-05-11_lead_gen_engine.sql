-- Lead generation engine: alerts, referrals, scraper audit, message templates
-- Run AFTER 2026-05-11_employees.sql.

-- 1. Speed-to-lead alerts: Slack/Discord/Twilio webhook the contractor wants
-- pinged the moment a new lead lands.
alter table public.profiles
  add column if not exists alert_webhook_url text,
  add column if not exists alert_phone text;  -- optional SMS via Twilio for personal pings

-- 2. Referral program.
create table if not exists public.referral_codes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  customer_id  uuid references public.customers(id) on delete set null,
  code         text not null unique,
  credit_cents int not null default 5000,         -- $50 each side, configurable later
  uses         int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists referral_codes_user_idx on public.referral_codes(user_id);

create table if not exists public.referral_redemptions (
  id            uuid primary key default gen_random_uuid(),
  code          text not null references public.referral_codes(code) on delete cascade,
  referred_email text,
  lead_id       uuid references public.leads(id) on delete set null,
  closed_at     timestamptz,
  credit_cents  int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists referral_redemptions_code_idx on public.referral_redemptions(code);

alter table public.referral_codes        enable row level security;
alter table public.referral_redemptions  enable row level security;

drop policy if exists "ref codes owner all" on public.referral_codes;
create policy "ref codes owner all" on public.referral_codes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ref redemptions owner read" on public.referral_redemptions;
create policy "ref redemptions owner read" on public.referral_redemptions
  for select using (
    exists (select 1 from public.referral_codes c
      where c.code = referral_redemptions.code and c.user_id = auth.uid())
  );

-- 3. Scraper audit log — track every external pull (Reddit, permits, etc.)
create table if not exists public.scraper_runs (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,                -- 'reddit', 'nyc_permits', 'chicago_permits', etc.
  region      text,                          -- zip / city / subreddit
  fetched     int not null default 0,        -- rows fetched from source
  inserted    int not null default 0,        -- rows written to marketplace_leads
  duplicates  int not null default 0,
  error       text,
  ran_at      timestamptz not null default now()
);
create index if not exists scraper_runs_source_idx on public.scraper_runs(source, ran_at desc);

-- 4. Message templates (used by contractor on lead detail + drip dispatch).
create table if not exists public.message_templates (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  channel    text not null check (channel in ('sms', 'email')),
  name       text not null,
  subject    text,
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists message_templates_user_idx on public.message_templates(user_id);

alter table public.message_templates enable row level security;
drop policy if exists "templates owner all" on public.message_templates;
create policy "templates owner all" on public.message_templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_message_templates_updated on public.message_templates;
create trigger set_message_templates_updated before update on public.message_templates
  for each row execute function public.set_updated_at();
