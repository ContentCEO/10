-- Per-profile onboarding video links (YouTube IDs). Run any time.

alter table public.profiles
  add column if not exists onboarding_videos jsonb not null default '[]';
