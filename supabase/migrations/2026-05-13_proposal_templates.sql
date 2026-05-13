-- Plan 1 / D-2 — Reusable proposal templates.

create table if not exists public.proposal_templates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  service_type  text,
  intro         text,
  terms         text,
  tiers         jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists proposal_templates_user_idx on public.proposal_templates (user_id, created_at desc);
