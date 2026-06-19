-- ───────────────────────────────────────────────────────────────────────────
-- Verification pipeline + Verified Seal (per spec §6.4, §6.5, §3.3).
-- The seal is the product's signature credential — a real, earned,
-- tiered mark backed by license + insurance + job-verified reviews +
-- response time. This migration:
--   1) tracks the submitted docs in a `verifications` table
--   2) adds the recomputed aggregates (seal_tier, median_response_mins,
--      win_rate) directly on profiles so the UI never computes on read
--   3) creates a single helper view of currently-eligible contractors
--      that the routing engine queries
-- ───────────────────────────────────────────────────────────────────────────

do $$ begin
  create type verification_status as enum ('unsubmitted', 'pending', 'approved', 'rejected', 'expired');
exception when duplicate_object then null; end $$;

do $$ begin
  create type seal_tier as enum ('none', 'verified', 'verified_pro', 'top_pro');
exception when duplicate_object then null; end $$;

create table if not exists public.verifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references auth.users(id) on delete cascade,
  status              verification_status not null default 'unsubmitted',

  -- MA-specific identifiers. We collect strings + verify them in the
  -- admin queue (operator calls MA OCABR / checks COI).
  hic_number          text,        -- MA Home Improvement Contractor reg #
  csl_number          text,        -- MA Construction Supervisor License (optional)
  insurance_carrier   text,
  insurance_policy    text,
  insurance_expiry    date,
  docs_urls           text[],      -- uploaded license/insurance scans (private)
  notes               text,        -- contractor-facing note (e.g. "DBA name")

  -- Audit trail
  submitted_at        timestamptz,
  reviewed_by         uuid references auth.users(id) on delete set null,
  reviewed_at         timestamptz,
  reject_reason       text,
  expiry_notified_at  timestamptz, -- last time we nudged about expiring insurance

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists verifications_status_idx        on public.verifications(status);
create index if not exists verifications_insurance_exp_idx on public.verifications(insurance_expiry) where status = 'approved';

-- updated_at trigger
create or replace function public.verifications_touch()
returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists verifications_touch_trg on public.verifications;
create trigger verifications_touch_trg
  before update on public.verifications
  for each row execute function public.verifications_touch();

alter table public.verifications enable row level security;

-- Contractors can read + insert + update their own row.
drop policy if exists verifications_own_select on public.verifications;
create policy verifications_own_select on public.verifications
  for select using (user_id = auth.uid());

drop policy if exists verifications_own_insert on public.verifications;
create policy verifications_own_insert on public.verifications
  for insert with check (user_id = auth.uid());

drop policy if exists verifications_own_update on public.verifications;
create policy verifications_own_update on public.verifications
  for update using (user_id = auth.uid() and status in ('unsubmitted', 'rejected'))
  with check (user_id = auth.uid());

-- ── Profile aggregates for the seal computation ──
-- The spec is explicit: nightly cron recomputes these and persists, so
-- reads are zero-cost and seal display never computes on render.
alter table public.profiles
  add column if not exists seal_tier            seal_tier not null default 'none',
  add column if not exists seal_earned_at       timestamptz,
  add column if not exists median_response_mins int,
  add column if not exists win_rate             numeric,           -- 0.0–1.0
  add column if not exists verified_review_count int not null default 0,
  add column if not exists last_review_at       timestamptz;

-- ── The single source of truth: who is currently eligible for routing? ──
-- The routing engine joins to this. Centralizing the eligibility rule
-- here means "we never offered a lead to an unverified pro" is enforced
-- in ONE place (SQL), not scattered across app code.
create or replace view public.eligible_contractors as
  select
    p.id                              as user_id,
    p.seal_tier,
    p.median_response_mins,
    p.win_rate
  from public.profiles p
  join public.marketplace_subscriptions s on s.user_id = p.id
  join public.verifications v             on v.user_id = p.id
  where s.status in ('active', 'trialing')
    and v.status = 'approved'
    and (v.insurance_expiry is null or v.insurance_expiry > current_date);

comment on view public.eligible_contractors is
  'Routing engine queries this view. Adding new eligibility rules (e.g. pause flag, bad-rating gate) belongs here, not in routing.ts.';
