-- Invoicing + AR aging
-- Run AFTER 2026-05-11_recurring.sql.

do $$ begin
  create type invoice_status as enum ('draft', 'sent', 'paid', 'void');
exception when duplicate_object then null; end $$;

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  job_id uuid references public.jobs(id) on delete set null,
  number text,
  amount_cents int not null check (amount_cents >= 0),
  tax_cents int not null default 0 check (tax_cents >= 0),
  notes text,
  status invoice_status not null default 'draft',
  issued_at date not null default current_date,
  due_at date,
  sent_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists invoices_user_idx on public.invoices(user_id);
create index if not exists invoices_status_idx on public.invoices(status);
create index if not exists invoices_due_idx on public.invoices(due_at);

alter table public.invoices enable row level security;
drop policy if exists "invoices owner all" on public.invoices;
create policy "invoices owner all" on public.invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop trigger if exists set_invoices_updated on public.invoices;
create trigger set_invoices_updated before update on public.invoices
  for each row execute function public.set_updated_at();

-- Optional: contractor's pre-configured Stripe payment link, surfaced on the
-- public invoice page as the 'Pay now' button. Bring your own link.
alter table public.profiles
  add column if not exists payment_link_url text;
