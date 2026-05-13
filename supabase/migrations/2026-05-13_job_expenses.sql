-- Per-job material + labor expenses. Subtract from job.price to get
-- true profit. Quarterly tax report exports off this table.

create table if not exists public.job_expenses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  job_id       uuid references public.jobs(id) on delete set null,
  kind         text not null check (kind in ('material','labor','subcontractor','equipment','permit','fuel','other')),
  vendor       text,
  description  text,
  amount_cents int not null check (amount_cents >= 0),
  tax_cents    int not null default 0,
  receipt_url  text,
  spent_at     date not null default current_date,
  created_at   timestamptz not null default now()
);

create index if not exists job_expenses_user_idx     on public.job_expenses(user_id);
create index if not exists job_expenses_job_idx      on public.job_expenses(job_id);
create index if not exists job_expenses_spent_idx    on public.job_expenses(spent_at desc);

alter table public.job_expenses enable row level security;

drop policy if exists "expenses self" on public.job_expenses;
create policy "expenses self" on public.job_expenses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
