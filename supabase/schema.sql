-- ProposalPro AI — Supabase schema
-- Run in the Supabase SQL editor.

create extension if not exists "uuid-ossp";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  company_name text,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table if not exists public.proposals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_name text not null,
  client_email text,
  client_address text,
  project_type text,
  scope text,
  measurements text,
  materials text,
  labor text,
  notes text,
  generated_text text,
  line_items jsonb not null default '[]'::jsonb,
  payment_schedule jsonb not null default '[]'::jsonb,
  timeline jsonb not null default '[]'::jsonb,
  terms text,
  total_amount numeric(12,2) not null default 0,
  status text not null default 'draft',
  photos jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists proposals_user_id_idx on public.proposals(user_id);
create index if not exists proposals_created_at_idx on public.proposals(created_at desc);

-- Storage bucket for project photos
insert into storage.buckets (id, name, public)
values ('proposal-photos', 'proposal-photos', true)
on conflict (id) do nothing;

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.proposals enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self upsert" on public.profiles;
create policy "profiles self upsert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "proposals owner read" on public.proposals;
create policy "proposals owner read" on public.proposals
  for select using (auth.uid() = user_id);

drop policy if exists "proposals owner insert" on public.proposals;
create policy "proposals owner insert" on public.proposals
  for insert with check (auth.uid() = user_id);

drop policy if exists "proposals owner update" on public.proposals;
create policy "proposals owner update" on public.proposals
  for update using (auth.uid() = user_id);

drop policy if exists "proposals owner delete" on public.proposals;
create policy "proposals owner delete" on public.proposals
  for delete using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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
