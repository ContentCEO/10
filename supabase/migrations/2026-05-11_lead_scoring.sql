-- AI lead scoring on contractor pipeline + speed-to-lead
-- Run AFTER 2026-05-11_lead_sources.sql.

alter table public.leads
  add column if not exists ai_score int check (ai_score between 0 and 100),
  add column if not exists ai_summary text,
  add column if not exists ai_scored_at timestamptz,
  -- Speed-to-lead: when did the contractor first move this lead out of 'new'?
  add column if not exists first_responded_at timestamptz;

create index if not exists leads_ai_score_idx on public.leads(ai_score desc nulls last);

-- Trigger: when status moves from 'new' to anything else, stamp first_responded_at.
create or replace function public.stamp_lead_first_response()
returns trigger language plpgsql as $$
begin
  if old.status = 'new' and new.status <> 'new' and new.first_responded_at is null then
    new.first_responded_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists leads_first_response on public.leads;
create trigger leads_first_response
  before update on public.leads
  for each row execute function public.stamp_lead_first_response();
