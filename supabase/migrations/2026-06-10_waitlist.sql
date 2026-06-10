-- Public waitlist for the Marketplace + future module launches. Anyone can
-- submit (anon-key allowed via SECURITY DEFINER inserts from /api/waitlist),
-- only the platform owner can read.

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  source     text not null default 'landing',
  module     text not null default 'marketplace',
  created_at timestamptz not null default now()
);

create unique index if not exists waitlist_email_module_uidx
  on public.waitlist(lower(email), module);

alter table public.waitlist enable row level security;

-- No public select. Inserts go through the service role from /api/waitlist.
drop policy if exists waitlist_no_anon_select on public.waitlist;
create policy waitlist_no_anon_select on public.waitlist
  for select using (false);
