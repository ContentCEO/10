-- AIStaffer initial schema
-- Multi-tenant model: auth.users -> organizations (1:1 owner) -> ai_employees -> conversations/messages/leads

create extension if not exists "pgcrypto";

-- =========================================================
-- Organizations (one workspace per signup; can invite later)
-- =========================================================
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  plan text not null default 'free' check (plan in ('free','starter','pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create index if not exists organizations_owner_id_idx on public.organizations(owner_id);

-- =========================================================
-- AI Employees
-- =========================================================
create table if not exists public.ai_employees (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  role text not null check (role in ('receptionist','sales','estimator','support')),
  name text not null,
  -- Free-form business profile
  business_name text,
  business_phone text,
  business_email text,
  business_address text,
  business_hours text,
  service_area text,
  about text,
  -- Voice / behavior
  greeting text,
  tone text default 'friendly-professional',
  -- Structured knowledge as JSONB
  services jsonb not null default '[]'::jsonb,    -- [{name, description, price_range}]
  pricing jsonb not null default '{}'::jsonb,     -- {labor_rate, minimum, etc}
  faqs jsonb not null default '[]'::jsonb,        -- [{question, answer}]
  policies jsonb not null default '[]'::jsonb,    -- [{title, body}]
  -- Lead qualification config
  lead_fields jsonb not null default '["name","phone","email","service","address","timeline"]'::jsonb,
  -- Public chat config
  is_published boolean not null default false,
  public_slug text unique,
  widget_color text default '#0070c4',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_employees_org_id_idx on public.ai_employees(org_id);
create index if not exists ai_employees_public_slug_idx on public.ai_employees(public_slug);

-- =========================================================
-- Conversations
-- =========================================================
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  ai_employee_id uuid not null references public.ai_employees(id) on delete cascade,
  visitor_token text not null,                   -- anonymous visitor identifier (cookie)
  channel text not null default 'web' check (channel in ('web','widget','sms')),
  source_url text,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create index if not exists conversations_employee_id_idx on public.conversations(ai_employee_id);
create index if not exists conversations_visitor_idx on public.conversations(ai_employee_id, visitor_token);

-- =========================================================
-- Messages
-- =========================================================
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages(conversation_id, created_at);

-- =========================================================
-- Leads (captured from chats or forms)
-- =========================================================
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  ai_employee_id uuid not null references public.ai_employees(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  name text,
  phone text,
  email text,
  service text,
  address text,
  timeline text,
  notes text,
  status text not null default 'new' check (status in ('new','contacted','qualified','won','lost')),
  qualification jsonb,                            -- { score, reason, suggested_next_step }
  created_at timestamptz not null default now()
);

create index if not exists leads_employee_id_idx on public.leads(ai_employee_id, created_at desc);

-- =========================================================
-- Row Level Security
-- =========================================================
alter table public.organizations enable row level security;
alter table public.ai_employees   enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.leads          enable row level security;

-- Organizations: owner can read/write their org
drop policy if exists "org_owner_all" on public.organizations;
create policy "org_owner_all" on public.organizations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Helper: user owns an org
create or replace function public.user_owns_org(p_org_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1 from public.organizations o
    where o.id = p_org_id and o.owner_id = auth.uid()
  );
$$;

-- AI Employees: scoped to user's org
drop policy if exists "employees_owner_all" on public.ai_employees;
create policy "employees_owner_all" on public.ai_employees
  for all using (public.user_owns_org(org_id))
  with check  (public.user_owns_org(org_id));

-- Helper: user owns the org that owns the employee
create or replace function public.user_owns_employee(p_employee_id uuid) returns boolean
language sql stable as $$
  select exists (
    select 1
    from public.ai_employees e
    join public.organizations o on o.id = e.org_id
    where e.id = p_employee_id and o.owner_id = auth.uid()
  );
$$;

-- Conversations / Messages / Leads: owner-only via the employee
drop policy if exists "conversations_owner_all" on public.conversations;
create policy "conversations_owner_all" on public.conversations
  for all using (public.user_owns_employee(ai_employee_id))
  with check  (public.user_owns_employee(ai_employee_id));

drop policy if exists "messages_owner_all" on public.messages;
create policy "messages_owner_all" on public.messages
  for all using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and public.user_owns_employee(c.ai_employee_id)
    )
  );

drop policy if exists "leads_owner_all" on public.leads;
create policy "leads_owner_all" on public.leads
  for all using (public.user_owns_employee(ai_employee_id))
  with check  (public.user_owns_employee(ai_employee_id));

-- Note: public chat traffic uses the SERVICE ROLE key in the API route
-- (server-only), which bypasses RLS. That keeps the public widget working
-- without exposing tenant data to anonymous JWTs.
