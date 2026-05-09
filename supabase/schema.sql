-- AdForge AI database schema
-- Run this in the Supabase SQL editor (or via the CLI) on a fresh project.

-- ===============================
-- profiles: per-user metadata + plan
-- ===============================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  plan text not null default 'free',           -- free | starter | pro
  stripe_customer_id text,
  stripe_subscription_id text,
  monthly_generations_used int not null default 0,
  monthly_generations_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ===============================
-- businesses: business profile setup
-- ===============================
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  industry text,
  website text,
  description text,
  target_audience text,
  brand_voice text,                              -- e.g. "playful", "premium", "direct"
  unique_value_prop text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_user_id_idx on public.businesses(user_id);

-- ===============================
-- products: products / services owned by a business
-- ===============================
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  price text,
  features text,                                  -- bulleted features
  benefits text,                                  -- bulleted benefits
  pain_points text,                               -- problems it solves
  created_at timestamptz not null default now()
);

create index if not exists products_business_id_idx on public.products(business_id);

-- ===============================
-- offers: the offer / promo around a product
-- ===============================
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  headline text not null,
  details text,
  cta text,                                       -- "Shop now", "Book a call", etc.
  guarantee text,
  urgency text,                                   -- e.g. "Ends Sunday"
  bonus text,
  created_at timestamptz not null default now()
);

create index if not exists offers_product_id_idx on public.offers(product_id);

-- ===============================
-- campaigns: a generated set of ad creatives
-- ===============================
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid references public.businesses(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  offer_id uuid references public.offers(id) on delete set null,
  name text not null,
  objective text,                                 -- conversions, traffic, leads, awareness
  platform text not null default 'meta',          -- meta | facebook | instagram
  structure jsonb,                                -- campaign / ad-set / ad structure suggestion
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_user_id_idx on public.campaigns(user_id);

-- ===============================
-- ad_creatives: individual generated ads belonging to a campaign
-- ===============================
create table if not exists public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  variant_label text,                             -- e.g. "Variant A"
  angle text,                                     -- problem/solution, social proof, etc.
  headline text,
  primary_text text,
  description text,
  hook text,
  cta text,
  image_prompt text,
  video_script text,
  saved boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists ad_creatives_campaign_id_idx on public.ad_creatives(campaign_id);
create index if not exists ad_creatives_user_id_idx on public.ad_creatives(user_id);

-- ===============================
-- Row Level Security
-- ===============================
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.products enable row level security;
alter table public.offers enable row level security;
alter table public.campaigns enable row level security;
alter table public.ad_creatives enable row level security;

-- profiles
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert with check (auth.uid() = id);

-- generic owner policy macro applied per table
do $$
declare
  t text;
begin
  for t in select unnest(array['businesses','products','offers','campaigns','ad_creatives'])
  loop
    execute format('drop policy if exists "%I owner all" on public.%I', t, t);
    execute format(
      'create policy "%I owner all" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t, t
    );
  end loop;
end$$;

-- ===============================
-- Auto-create profile on signup
-- ===============================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
