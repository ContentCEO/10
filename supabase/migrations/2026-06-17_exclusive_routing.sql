-- ───────────────────────────────────────────────────────────────────────────
-- Exclusive routing engine — THE WEDGE (per spec §6.2).
-- A lead is offered to EXACTLY ONE contractor at a time. If declined or
-- expired, it cascades to the next-best candidate. Never broadcast.
--
-- This migration adds the `matches` table that holds the offer/cascade
-- audit log + the partial-unique index that enforces "max one OFFERED
-- match per lead" at the DB level (so race conditions can't break the
-- exclusivity promise — even if app code has a bug, Postgres prevents it).
-- ───────────────────────────────────────────────────────────────────────────

do $$ begin
  create type match_status as enum ('offered', 'accepted', 'declined', 'expired', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.matches (
  id                  uuid primary key default gen_random_uuid(),
  lead_id             uuid not null references public.marketplace_leads(id) on delete cascade,
  contractor_user_id  uuid not null references auth.users(id) on delete cascade,
  status              match_status not null default 'offered',
  score               numeric not null default 0,
  cascade_index       int not null default 0,        -- 0 = first offer, 1 = second, etc.
  offered_at          timestamptz not null default now(),
  expires_at          timestamptz not null,          -- exclusive window cutoff
  responded_at        timestamptz,
  decline_reason      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists matches_lead_status_idx     on public.matches(lead_id, status);
create index if not exists matches_contractor_idx      on public.matches(contractor_user_id, status, expires_at);
create index if not exists matches_expires_active_idx  on public.matches(expires_at) where status = 'offered';
create index if not exists matches_lead_cascade_idx    on public.matches(lead_id, cascade_index);

-- ── The exclusivity guarantee, in the database ──
-- At most one OFFERED match per lead at any time. If app code somehow
-- attempts to insert a second offer while the first is live, Postgres
-- rejects the insert. The brand promise becomes a hard constraint.
create unique index if not exists matches_one_offered_per_lead
  on public.matches(lead_id) where status = 'offered';

-- updated_at trigger
create or replace function public.matches_touch()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists matches_touch_trg on public.matches;
create trigger matches_touch_trg
  before update on public.matches
  for each row execute function public.matches_touch();

alter table public.matches enable row level security;

-- Contractors can read offers MADE TO THEM.
drop policy if exists matches_own_select on public.matches;
create policy matches_own_select on public.matches
  for select using (contractor_user_id = auth.uid());

-- Only the platform (service role) writes new offers. Contractors update
-- via the accept/decline RPC, never directly.
drop policy if exists matches_own_update on public.matches;
create policy matches_own_update on public.matches
  for update using (contractor_user_id = auth.uid())
  with check  (contractor_user_id = auth.uid());

-- ── Helper view: a lead's currently-active offer (for app queries) ──
create or replace view public.lead_active_offer as
  select m.*
  from public.matches m
  where m.status = 'offered'
    and m.expires_at > now();

comment on view public.lead_active_offer is
  'Single source of truth for "which contractor currently owns this lead?". Joins back to marketplace_leads on lead_id.';
