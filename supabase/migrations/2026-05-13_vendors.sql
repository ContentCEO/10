-- Vendor / supplier directory. Hardware stores, parts warehouses,
-- material suppliers — places the contractor buys from regularly.
-- Linked to job_expenses via vendor name (free-text for now).

create table if not exists public.vendors (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  category      text,
  phone         text,
  email         text,
  website       text,
  address       text,
  account_number text,
  notes         text,
  is_preferred  boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists vendors_user_idx on public.vendors(user_id);

alter table public.vendors enable row level security;
drop policy if exists "vendors self" on public.vendors;
create policy "vendors self" on public.vendors
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
