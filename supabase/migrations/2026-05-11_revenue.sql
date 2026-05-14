-- Revenue intelligence + automation
-- Run AFTER 2026-05-11_contractor_directory.sql.

-- 1. Job profitability — track estimated + actual cost in cents so we can
-- compute margin per job.
alter table public.jobs
  add column if not exists cost_estimate_cents int,
  add column if not exists cost_actual_cents   int;

-- 2. Where the contractor wants reviews to land (Google profile, Yelp, etc).
-- Also remember when the last review request was sent for a given job
-- so we don't pester the same client twice from one click.
alter table public.profiles
  add column if not exists google_review_url text;

alter table public.jobs
  add column if not exists review_requested_at timestamptz;
