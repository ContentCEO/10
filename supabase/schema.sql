-- ContractorFlow database schema
-- Run with `supabase db push` or paste into the Supabase SQL editor.

-- ============================================================
-- ENUMS
-- ============================================================
do $$ begin
  create type lead_status as enum ('new', 'contacted', 'estimate_sent', 'won', 'lost');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled', 'incomplete');
exception when duplicate_object then null; end $$;

-- ============================================================
-- PROFILES — extends auth.users
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  business_name text,
  account_type text not null default 'contractor'
    check (account_type in ('homeowner', 'contractor')),
  credit_cents int not null default 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status subscription_status default 'trialing',
  trial_ends_at timestamptz default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  acct text;
begin
  acct := coalesce(new.raw_user_meta_data->>'account_type', 'contractor');
  if acct not in ('homeowner', 'contractor') then
    acct := 'contractor';
  end if;
  insert into public.profiles (id, email, account_type)
  values (new.id, new.email, acct)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- CUSTOMERS
-- ============================================================
do $$ begin
  create type recurring_frequency as enum ('weekly', 'biweekly', 'monthly', 'quarterly');
exception when duplicate_object then null; end $$;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  recurring_frequency recurring_frequency,
  recurring_service   text,
  recurring_price     numeric(10,2),
  recurring_next_at   date,
  recurring_active    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_user_idx on public.customers(user_id);
create index if not exists customers_recurring_due_idx
  on public.customers(recurring_next_at)
  where recurring_active = true;

-- ============================================================
-- LEADS
-- ============================================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  name text not null,
  phone text,
  email text,
  source text,
  service_type text,
  estimated_value numeric(10,2),
  status lead_status not null default 'new',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_user_idx on public.leads(user_id);
create index if not exists leads_status_idx on public.leads(status);

-- ============================================================
-- JOBS
-- ============================================================
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  lead_id uuid references public.leads(id) on delete set null,
  title text not null,
  description text,
  start_date date,
  end_date date,
  status job_status not null default 'scheduled',
  price numeric(10,2),
  cost_estimate_cents int,
  cost_actual_cents   int,
  review_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_user_idx on public.jobs(user_id);
create index if not exists jobs_status_idx on public.jobs(status);

-- ============================================================
-- FOLLOW-UPS / REMINDERS
-- ============================================================
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete cascade,
  job_id uuid references public.jobs(id) on delete cascade,
  title text not null,
  notes text,
  due_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists follow_ups_user_idx on public.follow_ups(user_id);
create index if not exists follow_ups_due_idx on public.follow_ups(due_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles    enable row level security;
alter table public.customers   enable row level security;
alter table public.leads       enable row level security;
alter table public.jobs        enable row level security;
alter table public.follow_ups  enable row level security;

-- Profiles
drop policy if exists "profiles self read"   on public.profiles;
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self read"   on public.profiles for select using (auth.uid() = id);
create policy "profiles self update" on public.profiles for update using (auth.uid() = id);

-- Generic owner-only policy template applied per table.
do $$
declare t text;
begin
  foreach t in array array['customers','leads','jobs','follow_ups'] loop
    execute format('drop policy if exists "%1$s owner all" on public.%1$s;', t);
    execute format(
      'create policy "%1$s owner all" on public.%1$s for all using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t
    );
  end loop;
end $$;

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

do $$
declare t text;
begin
  foreach t in array array['customers','leads','jobs'] loop
    execute format('drop trigger if exists set_%1$s_updated on public.%1$s;', t);
    execute format(
      'create trigger set_%1$s_updated before update on public.%1$s for each row execute function public.set_updated_at();',
      t
    );
  end loop;
end $$;
