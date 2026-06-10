-- Monthly performance reports posted by Davi to each Launchpad client.
-- Davi uploads a PDF (or writes inline notes) at end of each month;
-- the client sees the list on /launchpad/reports.

create table if not exists public.launchpad_reports (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.launchpad_clients(id) on delete cascade,
  month       text not null,                  -- "2026-06" format, one per client per month
  pdf_url     text,                            -- supabase storage URL or external link
  spend_cents bigint not null default 0,
  leads       int    not null default 0,
  notes       text,
  created_at  timestamptz not null default now()
);

create unique index if not exists launchpad_reports_client_month_uidx
  on public.launchpad_reports(client_id, month);
create index if not exists launchpad_reports_client_idx
  on public.launchpad_reports(client_id, month desc);

alter table public.launchpad_reports enable row level security;

-- The client sees only their own reports, joined via launchpad_clients.user_id.
drop policy if exists launchpad_reports_owner_select on public.launchpad_reports;
create policy launchpad_reports_owner_select on public.launchpad_reports
  for select using (
    exists (
      select 1 from public.launchpad_clients lc
      where lc.id = launchpad_reports.client_id and lc.user_id = auth.uid()
    )
  );
