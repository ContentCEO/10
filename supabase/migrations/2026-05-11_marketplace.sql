-- ContractorFlow lead marketplace
-- Run this AFTER the base schema.sql.
-- These leads are the inventory ("Angi/HomeAdvisor-style"): anyone can submit one
-- via the public /find-pro page, contractors browse and claim them into their pipeline.

do $$ begin
  create type marketplace_status as enum ('available', 'sold', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type budget_tier as enum ('under_5k', '5k_15k', '15k_50k', 'over_50k', 'unsure');
exception when duplicate_object then null; end $$;

do $$ begin
  create type timeline_tier as enum ('asap', 'one_to_three_months', 'three_to_six_months', 'flexible');
exception when duplicate_object then null; end $$;

create table if not exists public.marketplace_leads (
  id uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  email       text,
  zip         text,
  city        text,
  service_type text not null,
  budget      budget_tier default 'unsure',
  timeline    timeline_tier default 'flexible',
  notes       text,
  ai_score    int default 50 check (ai_score between 0 and 100),
  ai_summary  text,
  price_cents int not null default 2500,        -- $25 default
  exclusivity text not null default 'shared',   -- 'shared' | 'exclusive'
  status      marketplace_status not null default 'available',
  buyer_id    uuid references auth.users(id) on delete set null,
  bought_at   timestamptz,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '14 days')
);
create index if not exists marketplace_leads_status_idx on public.marketplace_leads(status);
create index if not exists marketplace_leads_zip_idx on public.marketplace_leads(zip);
create index if not exists marketplace_leads_service_idx on public.marketplace_leads(service_type);

-- RLS: authenticated contractors can read 'available' leads (to browse the marketplace);
-- buyers can read leads they bought (to keep a record).
alter table public.marketplace_leads enable row level security;

drop policy if exists "marketplace browse available" on public.marketplace_leads;
create policy "marketplace browse available" on public.marketplace_leads
  for select using (
    auth.role() = 'authenticated' and (
      status = 'available' or buyer_id = auth.uid()
    )
  );

-- All mutations go through service-role (public form intake + admin scoring + buy action),
-- so no insert/update/delete policies are exposed to authenticated users.
