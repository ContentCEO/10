-- Per-contractor Marketplace subscription state.
-- One row per contractor (Stripe is source of truth, this is the local mirror).
-- Tier slug + included quota + used-this-period counter drive lead-claim logic.

create table if not exists public.marketplace_subscriptions (
  user_id                  uuid primary key references auth.users(id) on delete cascade,
  tier                     text check (tier in ('starter','growth','pro')),
  stripe_subscription_id   text unique,
  stripe_customer_id       text,
  status                   text not null default 'trialing'
                           check (status in ('trialing','active','past_due','canceled','incomplete','unpaid')),
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  leads_used_this_period   int    not null default 0,
  last_period_started_at   timestamptz not null default now(),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists ms_status_idx        on public.marketplace_subscriptions(status);
create index if not exists ms_customer_id_idx   on public.marketplace_subscriptions(stripe_customer_id);

create or replace function public.marketplace_subscriptions_touch()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists ms_touch_trg on public.marketplace_subscriptions;
create trigger ms_touch_trg
  before update on public.marketplace_subscriptions
  for each row execute function public.marketplace_subscriptions_touch();

alter table public.marketplace_subscriptions enable row level security;

drop policy if exists ms_owner_select on public.marketplace_subscriptions;
create policy ms_owner_select on public.marketplace_subscriptions
  for select using (auth.uid() = user_id);
