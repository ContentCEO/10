-- Plan 1 / Section E / Idea #7 — Win/loss reason tracker.
-- Plan 1 / Section E / Idea #8 — Quote-to-close time tracker.
--
-- Adds:
--   leads.win_loss_reason      — text, captured when status flips to won/lost
--   leads.estimate_sent_at     — when first quote went out
--   leads.closed_at            — when status flipped to won OR lost
--
-- A generated column `quote_to_close_days` exposes the delta in days.

alter table public.leads
  add column if not exists win_loss_reason   text,
  add column if not exists estimate_sent_at  timestamptz,
  add column if not exists closed_at         timestamptz;

create index if not exists leads_closed_at_idx on public.leads (closed_at) where closed_at is not null;

-- Helper: on status change to won/lost, stamp closed_at automatically.
create or replace function public.touch_leads_closed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status in ('won','lost') and (old.status is null or old.status not in ('won','lost')) then
    new.closed_at := coalesce(new.closed_at, now());
  end if;
  if new.status not in ('won','lost') then
    new.closed_at := null;
    new.win_loss_reason := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leads_closed_at on public.leads;
create trigger trg_leads_closed_at
  before update of status on public.leads
  for each row execute function public.touch_leads_closed_at();
