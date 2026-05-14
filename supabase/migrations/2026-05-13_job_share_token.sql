-- Public field service report token per job. Same pattern as
-- customer.portal_token: a long unguessable string the contractor
-- can share with the homeowner / property manager / GC to prove
-- the work was completed.

alter table public.jobs
  add column if not exists share_token text unique;

update public.jobs
  set share_token = replace(gen_random_uuid()::text, '-', '')
  where share_token is null;

alter table public.jobs
  alter column share_token set default replace(gen_random_uuid()::text, '-', '');

create index if not exists jobs_share_token_idx on public.jobs(share_token);
