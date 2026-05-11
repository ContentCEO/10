-- Wallet credit system for marketplace lead purchases.
-- Run this AFTER 2026-05-11_marketplace.sql.

-- 1. Add balance column to profiles (cents).
alter table public.profiles
  add column if not exists credit_cents int not null default 0;

-- 2. Wallet transactions ledger.
create table if not exists public.wallet_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  amount_cents int not null,                          -- positive = credit, negative = debit
  kind         text not null check (kind in ('topup', 'claim', 'refund', 'adjustment')),
  reference    text,                                  -- lead id or stripe session id
  description  text,
  created_at   timestamptz not null default now()
);
create index if not exists wallet_txns_user_idx on public.wallet_transactions(user_id);

alter table public.wallet_transactions enable row level security;
drop policy if exists "wallet txns owner read" on public.wallet_transactions;
create policy "wallet txns owner read" on public.wallet_transactions
  for select using (auth.uid() = user_id);

-- 3. Atomic debit function — prevents race conditions when two claims
--    arrive simultaneously. Returns true if the debit succeeded.
create or replace function public.debit_wallet(p_user_id uuid, p_amount int)
returns boolean
language plpgsql
security definer
as $$
declare
  affected int;
begin
  update public.profiles
  set credit_cents = credit_cents - p_amount
  where id = p_user_id and credit_cents >= p_amount;
  get diagnostics affected = row_count;
  return affected > 0;
end;
$$;

grant execute on function public.debit_wallet(uuid, int) to authenticated, service_role;
