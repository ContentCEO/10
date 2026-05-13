-- Plan 1 / A-10 — Pinned customers.
alter table public.customers
  add column if not exists is_pinned boolean not null default false;
create index if not exists customers_pinned_idx on public.customers (user_id, is_pinned) where is_pinned = true;
