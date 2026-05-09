-- LeadRevive AI initial schema
-- Run via Supabase SQL editor or `supabase db push`.

create extension if not exists "pgcrypto";

create type lead_status as enum (
  'not_contacted',
  'sent',
  'replied',
  'booked',
  'dead'
);

create type message_channel as enum ('sms', 'email');
create type message_direction as enum ('outbound', 'inbound');
create type message_state as enum ('draft', 'queued', 'sent', 'failed');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'My workspace',
  business_context text,
  stripe_customer_id text,
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  company text,
  notes text,
  source text,
  tags text[] default '{}',
  status lead_status not null default 'not_contacted',
  last_contacted_at timestamptz,
  created_at timestamptz not null default now()
);

create index leads_workspace_idx on public.leads(workspace_id);
create index leads_status_idx on public.leads(workspace_id, status);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  channel message_channel not null,
  goal text,
  tone text default 'friendly',
  steps jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  channel message_channel not null,
  direction message_direction not null default 'outbound',
  state message_state not null default 'draft',
  subject text,
  body text not null,
  provider_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_lead_idx on public.messages(lead_id);
create index messages_workspace_idx on public.messages(workspace_id, created_at desc);

-- RLS
alter table public.workspaces enable row level security;
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.messages enable row level security;

create policy "workspaces: owner read" on public.workspaces
  for select using (owner_id = auth.uid());
create policy "workspaces: owner write" on public.workspaces
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "leads: workspace member" on public.leads
  for all using (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  ) with check (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  );

create policy "campaigns: workspace member" on public.campaigns
  for all using (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  ) with check (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  );

create policy "messages: workspace member" on public.messages
  for all using (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  ) with check (
    workspace_id in (select id from public.workspaces where owner_id = auth.uid())
  );

-- Auto-create a workspace for each new user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.workspaces (owner_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'workspace_name', 'My workspace'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
