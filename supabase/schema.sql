-- LocalRank AI database schema
-- Run in Supabase SQL editor after creating a new project.

create extension if not exists "pgcrypto";

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  website text,
  category text,
  address text,
  city text,
  region text,
  postal_code text,
  country text,
  phone text,
  gbp_url text,
  primary_keyword text,
  service_area text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score int,
  summary text,
  findings jsonb default '[]'::jsonb,
  plan jsonb default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  category text,
  status text not null default 'open',
  priority text default 'medium',
  notes text,
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'todo',
  priority text default 'medium',
  created_at timestamptz not null default now()
);

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  website text,
  gbp_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.keyword_ideas (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  keyword text not null,
  intent text,
  difficulty text,
  rationale text,
  created_at timestamptz not null default now()
);

create table if not exists public.review_responses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  review_text text not null,
  rating int,
  tone text,
  response text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  plan text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- Row level security
alter table public.businesses enable row level security;
alter table public.audits enable row level security;
alter table public.checklist_items enable row level security;
alter table public.tasks enable row level security;
alter table public.competitors enable row level security;
alter table public.keyword_ideas enable row level security;
alter table public.review_responses enable row level security;
alter table public.subscriptions enable row level security;

create policy "own businesses" on public.businesses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own audits" on public.audits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own subscription" on public.subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "scoped checklist" on public.checklist_items for all using (
  exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
);

create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "scoped competitors" on public.competitors for all using (
  exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
);

create policy "scoped keywords" on public.keyword_ideas for all using (
  exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
);

create policy "scoped reviews" on public.review_responses for all using (
  exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
) with check (
  exists (select 1 from public.businesses b where b.id = business_id and b.user_id = auth.uid())
);
