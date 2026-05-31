-- Launchpad agency clients. One row per Davi's customer (a contractor who
-- bought a Launchpad tier). Tracks build stage, billing tier, ad accounts.

create table if not exists public.launchpad_clients (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,
  business_name          text not null,
  contact_name           text,
  contact_email          text,
  contact_phone          text,
  city                   text,
  state                  text default 'MA',
  tier                   text check (tier in (
                          'foundation','foundation_growth','revenue_share')),
  stage                  text not null default 'intake' check (stage in (
                          'intake','design','build','review','live','paused','churned')),
  website_url            text,
  preview_url            text,
  google_ads_customer_id text,
  meta_ad_account_id     text,
  monthly_budget_cents   bigint default 0,
  notes                  text,
  started_at             timestamptz not null default now(),
  went_live_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists launchpad_clients_user_id_idx
  on public.launchpad_clients(user_id);
create index if not exists launchpad_clients_stage_idx
  on public.launchpad_clients(stage);

-- updated_at trigger (reuse pattern from cf_subscriptions if it exists).
create or replace function public.launchpad_clients_touch()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists launchpad_clients_touch_trg on public.launchpad_clients;
create trigger launchpad_clients_touch_trg
  before update on public.launchpad_clients
  for each row execute function public.launchpad_clients_touch();

-- RLS off for owner-only access via service role. Client-facing
-- launchpad pages query their own row by user_id.
alter table public.launchpad_clients enable row level security;
drop policy if exists launchpad_clients_owner_select on public.launchpad_clients;
create policy launchpad_clients_owner_select on public.launchpad_clients
  for select using (auth.uid() = user_id);
