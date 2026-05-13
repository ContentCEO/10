-- Plan 1 / B-17 — Audit log of admin actions.
--
-- Tracks who did what across the platform. Captured automatically by any
-- admin-only endpoint that mutates state (agent toggles, lead promotions,
-- bulk operations, etc.). Read-only for everyone except the owner.

create table if not exists public.admin_audit (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  actor_email text,
  action      text not null,
  target      text,                -- e.g. "lead:abc-123" or "agent:lead-triage"
  details     jsonb not null default '{}'::jsonb,
  ip          text,
  created_at  timestamptz not null default now()
);
create index if not exists admin_audit_recent_idx on public.admin_audit (created_at desc);
create index if not exists admin_audit_actor_idx  on public.admin_audit (actor_id, created_at desc);
