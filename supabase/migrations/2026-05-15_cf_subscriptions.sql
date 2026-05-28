-- Contractor Flow per-module subscriptions. One row per user × module.
-- Lets a single user hold any combination of CRM / Launchpad / Marketplace /
-- Academy / Capital. The active set drives sidebar visibility + feature gates.

create table if not exists public.cf_subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  sub_brand                text not null check (sub_brand in (
                            'cf-crm', 'cf-launchpad', 'cf-marketplace',
                            'cf-academy', 'cf-capital')),
  tier                     text,                              -- "starter" / "growth" / "pro" / "foundation" / etc.
  status                   text not null default 'active'
                            check (status in (
                              'trialing','active','past_due','canceled',
                              'incomplete','paused')),
  stripe_subscription_id   text unique,
  stripe_price_id          text,
  current_period_end       timestamptz,
  started_at               timestamptz not null default now(),
  ends_at                  timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (user_id, sub_brand)
);

create index if not exists cf_subscriptions_user_id_idx
  on public.cf_subscriptions(user_id);

create index if not exists cf_subscriptions_active_idx
  on public.cf_subscriptions(user_id, sub_brand)
  where status in ('trialing', 'active');

-- RLS: users read their own subscriptions only.
alter table public.cf_subscriptions enable row level security;

drop policy if exists cf_subscriptions_owner_select on public.cf_subscriptions;
create policy cf_subscriptions_owner_select on public.cf_subscriptions
  for select using (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.cf_subscriptions_touch()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists cf_subscriptions_touch_trg on public.cf_subscriptions;
create trigger cf_subscriptions_touch_trg
  before update on public.cf_subscriptions
  for each row execute function public.cf_subscriptions_touch();
