-- Wave 8: lead disputes (buyer protection) + partner widgets (reverse marketplace)
-- Run AFTER 2026-05-11_lead_gen_engine.sql.

-- 1. Lead disputes — buyer requests refund/replacement for a bad lead
do $$ begin
  create type dispute_status as enum ('open', 'resolved_refund', 'resolved_no_refund', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dispute_reason as enum (
    'wrong_number', 'duplicate', 'out_of_area', 'spam',
    'wrong_service', 'unreachable', 'not_a_real_lead', 'other'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.lead_disputes (
  id                  uuid primary key default gen_random_uuid(),
  buyer_id            uuid not null references auth.users(id) on delete cascade,
  marketplace_lead_id uuid not null references public.marketplace_leads(id) on delete cascade,
  reason              dispute_reason not null,
  details             text,
  status              dispute_status not null default 'open',
  refund_cents        int not null default 0,
  resolved_at         timestamptz,
  resolved_by         uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now()
);
create index if not exists lead_disputes_buyer_idx  on public.lead_disputes(buyer_id);
create index if not exists lead_disputes_status_idx on public.lead_disputes(status);

alter table public.lead_disputes enable row level security;
drop policy if exists "disputes buyer all" on public.lead_disputes;
create policy "disputes buyer all" on public.lead_disputes
  for all using (auth.uid() = buyer_id) with check (auth.uid() = buyer_id);

-- 2. Partner widgets — reverse marketplace. Other contractors embed the AI
-- estimator on their site with their unique token; you earn a per-lead
-- platform fee while paying them wallet credit per delivered lead.
create table if not exists public.partner_widgets (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  token                 text not null unique,
  name                  text not null default 'My widget',
  credit_per_lead_cents int not null default 1000,   -- $10/lead default
  total_leads           int not null default 0,
  total_credit_cents    int not null default 0,
  created_at            timestamptz not null default now()
);
create index if not exists partner_widgets_user_idx  on public.partner_widgets(user_id);
create index if not exists partner_widgets_token_idx on public.partner_widgets(token);

alter table public.partner_widgets enable row level security;
drop policy if exists "widgets owner all" on public.partner_widgets;
create policy "widgets owner all" on public.partner_widgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Tag every marketplace_lead with the partner widget that generated it,
-- so the lead and credit are attributable.
alter table public.marketplace_leads
  add column if not exists partner_widget_id uuid references public.partner_widgets(id) on delete set null;
create index if not exists marketplace_leads_partner_idx on public.marketplace_leads(partner_widget_id);

-- 4. Atomic credit-wallet helper (mirror of debit_wallet) for partner payouts.
create or replace function public.credit_wallet(p_user_id uuid, p_amount int)
returns boolean
language plpgsql
security definer
as $$
begin
  update public.profiles
  set credit_cents = credit_cents + p_amount
  where id = p_user_id;
  return found;
end;
$$;
grant execute on function public.credit_wallet(uuid, int) to authenticated, service_role;
