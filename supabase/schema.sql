-- LocalContent AI — Supabase schema
-- Run inside the Supabase SQL editor.

create extension if not exists "uuid-ossp";

-- Business profile (one per user)
create table if not exists public.business_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  business_name text not null,
  business_type text not null,
  services text[] default '{}',
  city text,
  region text,
  brand_tone text default 'friendly',
  target_audience text,
  unique_selling_points text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Generated content
create type content_type as enum (
  'instagram_caption',
  'reel_idea',
  'before_after',
  'promo',
  'hashtags',
  'image_prompt'
);

create type content_status as enum ('draft', 'scheduled', 'published');

create table if not exists public.content_items (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type content_type not null,
  title text,
  body text not null,
  hashtags text,
  image_prompt text,
  scheduled_for date,
  status content_status not null default 'draft',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists content_items_user_idx on public.content_items(user_id);
create index if not exists content_items_scheduled_idx on public.content_items(user_id, scheduled_for);

-- Subscriptions (Stripe)
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text default 'free',
  status text default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

-- Row level security
alter table public.business_profiles enable row level security;
alter table public.content_items enable row level security;
alter table public.subscriptions enable row level security;

create policy "own profile" on public.business_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own content" on public.content_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);
