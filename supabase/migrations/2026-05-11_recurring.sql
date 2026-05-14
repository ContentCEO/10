-- Recurring service engine + automation
-- Run AFTER 2026-05-11_revenue.sql.

do $$ begin
  create type recurring_frequency as enum ('weekly', 'biweekly', 'monthly', 'quarterly');
exception when duplicate_object then null; end $$;

-- Customers can be put on a recurring schedule. The daily cron creates the
-- next job + reminder when recurring_next_at <= today, then advances
-- recurring_next_at to the following due date.
alter table public.customers
  add column if not exists recurring_frequency recurring_frequency,
  add column if not exists recurring_service   text,
  add column if not exists recurring_price     numeric(10,2),
  add column if not exists recurring_next_at   date,
  add column if not exists recurring_active    boolean not null default false;

create index if not exists customers_recurring_due_idx
  on public.customers(recurring_next_at)
  where recurring_active = true;
