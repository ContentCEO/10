-- AI Agent registry + action log.
--
-- Agents are autonomous worker processes that run on a schedule, take an
-- action (e.g., categorize a lead, draft a follow-up), and record what
-- they did. Some actions execute immediately; others queue for owner
-- approval before applying.

create table if not exists public.agents (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  description     text not null,
  category        text not null check (category in ('triage','marketing','sales','operations','support','reporting')),
  enabled         boolean not null default true,
  cadence_minutes int not null default 30,
  last_ran_at     timestamptz,
  next_due_at     timestamptz,
  config          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
create index if not exists agents_due_idx on public.agents (next_due_at) where enabled = true;

create table if not exists public.agent_actions (
  id                uuid primary key default gen_random_uuid(),
  agent_id          uuid references public.agents(id) on delete cascade,
  agent_slug        text not null,
  action_type       text not null,
  target_table      text,
  target_id         text,
  summary           text not null,
  details           jsonb not null default '{}'::jsonb,
  requires_approval boolean not null default false,
  approved          boolean,
  approved_by       uuid references auth.users(id) on delete set null,
  approved_at       timestamptz,
  applied           boolean not null default false,
  applied_at        timestamptz,
  error             text,
  created_at        timestamptz not null default now()
);
create index if not exists agent_actions_recent_idx on public.agent_actions (created_at desc);
create index if not exists agent_actions_pending_idx on public.agent_actions (requires_approval, approved) where requires_approval = true and approved is null;

-- Seed the agent roster (idempotent via ON CONFLICT).
insert into public.agents (slug, name, description, category, cadence_minutes, config) values
  ('lead-triage',           'Lead Triage',
   'Reads new scraped marketplace leads, categorizes service type, and flags hot ones (>=80 score, urgent timeline) for owner attention.',
   'triage', 15, '{"min_score_to_flag":80}'::jsonb),

  ('followup-drafter',      'Follow-Up Drafter',
   'Generates a personalized first-touch message (SMS + email versions) when a contractor claims a marketplace lead. Owner approves before send.',
   'sales', 60, '{"channels":["sms","email"]}'::jsonb),

  ('appointment-scheduler', 'Appointment Scheduler',
   'When a lead replies expressing interest, offers 3 time slots based on calendar availability and books the first accepted one.',
   'sales', 30, '{"slot_window_days":14,"slots_per_offer":3}'::jsonb),

  ('marketing-analyzer',    'Marketing Source Analyzer',
   'Daily roll-up of which lead sources converted to paid jobs in the last 30 days. Flags underperformers and suggests reallocation.',
   'reporting', 1440, '{"lookback_days":30}'::jsonb),

  ('customer-health',       'Customer Health Monitor',
   'Tracks days since last contact for active customers; flags when it crosses the staleness threshold so a check-in can be scheduled.',
   'support', 720, '{"stale_days":45}'::jsonb),

  ('review-requester',      'Review Requester',
   'Detects jobs marked complete with no review yet; drafts a polite review-request message after 3 days. Owner approves the message.',
   'marketing', 360, '{"wait_days":3}'::jsonb),

  ('curation-assistant',    'Curation Assistant',
   'Reviews scraped leads in the curation queue, auto-approves obvious matches (high score + clean data), flags edge cases for owner review.',
   'triage', 30, '{"auto_approve_score":90}'::jsonb),

  ('dead-lead-revival',     'Dead Lead Revival',
   'Identifies leads in "Lost" status for 60+ days and drafts a polite re-engagement message ("Are you still considering?"). Owner approves.',
   'sales', 1440, '{"dead_after_days":60}'::jsonb),

  ('weekly-digest',         'Weekly Owner Digest',
   'Sunday-evening summary email to the owner: leads, revenue, agent actions, anomalies. No approval needed; informational.',
   'reporting', 10080, '{"send_day":"sunday","send_hour_local":18}'::jsonb),

  ('cron-watchdog',         'Cron Watchdog',
   'Polls scraper_runs to detect any source that has not run in 2× its expected interval; alerts owner.',
   'operations', 60, '{"alert_multiplier":2}'::jsonb)
on conflict (slug) do nothing;
