-- HomeCare Club schema
-- Run this in the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- Roles & profiles ----------------------------------------------------------

create type user_role as enum ('admin', 'customer');

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text,
  email text not null,
  phone text,
  street text,
  city text,
  state text,
  postal_code text,
  stripe_customer_id text unique,
  created_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on profiles(role);

-- Plans (handyman business sets these up) -----------------------------------

create table if not exists plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents integer not null,
  interval text not null default 'month',
  stripe_price_id text unique,
  visits_per_year integer not null default 0,
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Subscriptions -------------------------------------------------------------

create type subscription_status as enum (
  'incomplete', 'trialing', 'active', 'past_due',
  'canceled', 'unpaid', 'paused'
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  plan_id uuid references plans(id),
  stripe_subscription_id text unique,
  status subscription_status not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_customer_idx on subscriptions(customer_id);

-- Service Requests ----------------------------------------------------------

create type request_status as enum (
  'submitted', 'scheduled', 'in_progress', 'completed', 'canceled'
);

create type request_priority as enum ('low', 'normal', 'high', 'urgent');

create table if not exists service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  category text,
  priority request_priority not null default 'normal',
  status request_status not null default 'submitted',
  preferred_date date,
  preferred_time_window text,
  address text,
  created_at timestamptz not null default now()
);

create index if not exists service_requests_customer_idx on service_requests(customer_id);
create index if not exists service_requests_status_idx on service_requests(status);

-- Jobs (scheduled appointments / work orders) -------------------------------

create type job_status as enum (
  'scheduled', 'en_route', 'in_progress', 'completed', 'canceled'
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid references service_requests(id) on delete set null,
  customer_id uuid not null references profiles(id) on delete cascade,
  technician_name text,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  status job_status not null default 'scheduled',
  notes text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists jobs_customer_idx on jobs(customer_id);
create index if not exists jobs_scheduled_idx on jobs(scheduled_at);

-- Maintenance reminders -----------------------------------------------------

create type reminder_channel as enum ('email', 'sms', 'both');
create type reminder_status as enum ('pending', 'sent', 'failed');

create table if not exists maintenance_reminders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  send_at timestamptz not null,
  channel reminder_channel not null default 'email',
  status reminder_status not null default 'pending',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists reminders_send_at_idx on maintenance_reminders(send_at);
create index if not exists reminders_status_idx on maintenance_reminders(status);

-- Payments ------------------------------------------------------------------

create type payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  subscription_id uuid references subscriptions(id) on delete set null,
  amount_cents integer not null,
  currency text not null default 'usd',
  status payment_status not null default 'pending',
  stripe_invoice_id text,
  stripe_payment_intent_id text,
  description text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_customer_idx on payments(customer_id);

-- Invoices ------------------------------------------------------------------

create type invoice_status as enum ('draft', 'open', 'paid', 'void');

create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  customer_id uuid not null references profiles(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  subtotal_cents integer not null default 0,
  tax_cents integer not null default 0,
  total_cents integer not null default 0,
  status invoice_status not null default 'draft',
  notes text,
  due_date date,
  issued_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity numeric not null default 1,
  unit_price_cents integer not null default 0,
  total_cents integer not null default 0
);

-- Auto-create profile on signup --------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Row Level Security --------------------------------------------------------

alter table profiles enable row level security;
alter table plans enable row level security;
alter table subscriptions enable row level security;
alter table service_requests enable row level security;
alter table jobs enable row level security;
alter table maintenance_reminders enable row level security;
alter table payments enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;

create or replace function is_admin() returns boolean language sql stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Profiles: users see/update their own row; admins see all.
drop policy if exists "profiles self read" on profiles;
create policy "profiles self read" on profiles for select
  using (auth.uid() = id or is_admin());

drop policy if exists "profiles self update" on profiles;
create policy "profiles self update" on profiles for update
  using (auth.uid() = id or is_admin());

drop policy if exists "profiles admin insert" on profiles;
create policy "profiles admin insert" on profiles for insert
  with check (auth.uid() = id or is_admin());

-- Plans: anyone authed can read; admins manage.
drop policy if exists "plans read" on plans;
create policy "plans read" on plans for select using (auth.role() = 'authenticated');
drop policy if exists "plans admin write" on plans;
create policy "plans admin write" on plans for all using (is_admin()) with check (is_admin());

-- Subscriptions: customer sees own; admin sees all.
drop policy if exists "subs read" on subscriptions;
create policy "subs read" on subscriptions for select
  using (customer_id = auth.uid() or is_admin());
drop policy if exists "subs admin write" on subscriptions;
create policy "subs admin write" on subscriptions for all
  using (is_admin()) with check (is_admin());

-- Service requests: customer can CRUD own; admin sees all.
drop policy if exists "sr read" on service_requests;
create policy "sr read" on service_requests for select
  using (customer_id = auth.uid() or is_admin());
drop policy if exists "sr write own" on service_requests;
create policy "sr write own" on service_requests for insert
  with check (customer_id = auth.uid() or is_admin());
drop policy if exists "sr update" on service_requests;
create policy "sr update" on service_requests for update
  using (customer_id = auth.uid() or is_admin());

-- Jobs: customer sees own; admin manages.
drop policy if exists "jobs read" on jobs;
create policy "jobs read" on jobs for select
  using (customer_id = auth.uid() or is_admin());
drop policy if exists "jobs admin write" on jobs;
create policy "jobs admin write" on jobs for all
  using (is_admin()) with check (is_admin());

-- Reminders: customer sees own; admin manages.
drop policy if exists "rem read" on maintenance_reminders;
create policy "rem read" on maintenance_reminders for select
  using (customer_id = auth.uid() or is_admin());
drop policy if exists "rem admin write" on maintenance_reminders;
create policy "rem admin write" on maintenance_reminders for all
  using (is_admin()) with check (is_admin());

-- Payments: customer sees own; admin sees all.
drop policy if exists "pay read" on payments;
create policy "pay read" on payments for select
  using (customer_id = auth.uid() or is_admin());
drop policy if exists "pay admin write" on payments;
create policy "pay admin write" on payments for all
  using (is_admin()) with check (is_admin());

-- Invoices: customer sees own; admin manages.
drop policy if exists "inv read" on invoices;
create policy "inv read" on invoices for select
  using (customer_id = auth.uid() or is_admin());
drop policy if exists "inv admin write" on invoices;
create policy "inv admin write" on invoices for all
  using (is_admin()) with check (is_admin());

drop policy if exists "inv items read" on invoice_line_items;
create policy "inv items read" on invoice_line_items for select using (
  exists (
    select 1 from invoices i where i.id = invoice_id
    and (i.customer_id = auth.uid() or is_admin())
  )
);
drop policy if exists "inv items admin write" on invoice_line_items;
create policy "inv items admin write" on invoice_line_items for all
  using (is_admin()) with check (is_admin());

-- Seed plans (idempotent) ---------------------------------------------------

insert into plans (name, description, price_cents, interval, visits_per_year, features)
values
  ('Basic',    'Quarterly check-ins to keep small issues from becoming big ones.',  2900, 'month', 4,  '["Quarterly inspection","Priority booking","10% off services"]'),
  ('Standard', 'Routine maintenance plus seasonal HVAC and plumbing checks.',       5900, 'month', 8,  '["Bi-monthly visits","Seasonal HVAC tune-up","Plumbing inspection","15% off services"]'),
  ('Premium',  'Comprehensive monthly maintenance with same-day priority response.',9900, 'month', 12, '["Monthly visit","Same-day priority","Smoke/CO detector checks","20% off services"]')
on conflict do nothing;
