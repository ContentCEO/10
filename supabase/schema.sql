-- ContractorClose AI database schema
-- Run this in the Supabase SQL editor.

create extension if not exists "uuid-ossp";

-- Profiles: extends auth.users
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  company text,
  trade text,
  plan text not null default 'free',
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

-- Sales call analyses
create table if not exists public.calls (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  prospect_name text,
  job_type text,
  transcript text not null,
  score integer,
  close_probability integer,
  summary text,
  strengths jsonb,
  missed_opportunities jsonb,
  objections jsonb,
  followup_email text,
  followup_sms text,
  next_steps jsonb,
  raw_response jsonb,
  created_at timestamptz not null default now()
);
create index if not exists calls_user_id_idx on public.calls(user_id);
create index if not exists calls_created_at_idx on public.calls(created_at desc);

-- Saved sales scripts
create table if not exists public.scripts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  scenario text,
  trade text,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists scripts_user_id_idx on public.scripts(user_id);

-- Personal objection-handling library
create table if not exists public.objections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  objection text not null,
  category text,
  response text not null,
  created_at timestamptz not null default now()
);
create index if not exists objections_user_id_idx on public.objections(user_id);

-- Trigger: create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.calls enable row level security;
alter table public.scripts enable row level security;
alter table public.objections enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "Calls owner read" on public.calls;
create policy "Calls owner read" on public.calls
  for select using (auth.uid() = user_id);
drop policy if exists "Calls owner write" on public.calls;
create policy "Calls owner write" on public.calls
  for insert with check (auth.uid() = user_id);
drop policy if exists "Calls owner update" on public.calls;
create policy "Calls owner update" on public.calls
  for update using (auth.uid() = user_id);
drop policy if exists "Calls owner delete" on public.calls;
create policy "Calls owner delete" on public.calls
  for delete using (auth.uid() = user_id);

drop policy if exists "Scripts owner all" on public.scripts;
create policy "Scripts owner all" on public.scripts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Objections owner all" on public.objections;
create policy "Objections owner all" on public.objections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
