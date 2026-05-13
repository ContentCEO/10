-- Plan 1 / D-9 — NPS survey responses.
-- Plan 1 / E-9 — Auto-pricing engine settings.
-- Plan 1 / E-19 — No-show / no-payment fee defaults.

create table if not exists public.nps_responses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  customer_id   uuid,
  job_id        uuid,
  score         int not null check (score between 0 and 10),
  comment       text,
  created_at    timestamptz not null default now()
);
create index if not exists nps_recent_idx on public.nps_responses (user_id, created_at desc);

-- Pricing rules: contractor sets base $/sqft (or per-unit) per service.
create table if not exists public.pricing_rules (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  service_key   text not null,
  unit_label    text not null,           -- 'sqft' / 'linear_ft' / 'fixtures' / 'rooms' / 'panels'
  base_cents    int  not null default 0,
  per_unit_cents int not null default 0,
  multiplier    numeric(4,2) not null default 1.0,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (user_id, service_key)
);

-- No-show / late-payment fee settings on profile.
alter table public.profiles
  add column if not exists no_show_fee_cents    int not null default 7500,
  add column if not exists late_payment_pct     numeric(4,2) not null default 1.5,
  add column if not exists late_payment_grace_days int not null default 14;
