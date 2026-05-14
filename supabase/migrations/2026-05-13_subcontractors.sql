-- Subcontractor directory + per-job assignments. Tracks who's working
-- what, their hourly/flat rate, contact info, and outstanding payouts.

create table if not exists public.subcontractors (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  trade         text,
  phone         text,
  email         text,
  rate_kind     text not null default 'hourly' check (rate_kind in ('hourly','flat','percent')),
  rate_cents    int not null default 0,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists subs_user_idx on public.subcontractors(user_id);
alter table public.subcontractors enable row level security;
drop policy if exists "subs self" on public.subcontractors;
create policy "subs self" on public.subcontractors
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.subcontractor_assignments (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  subcontractor_id  uuid not null references public.subcontractors(id) on delete cascade,
  job_id            uuid references public.jobs(id) on delete set null,
  hours             numeric(6,2),
  payout_cents      int not null default 0,
  paid_at           timestamptz,
  notes             text,
  created_at        timestamptz not null default now()
);
create index if not exists sub_assign_user_idx on public.subcontractor_assignments(user_id);
create index if not exists sub_assign_sub_idx  on public.subcontractor_assignments(subcontractor_id);
create index if not exists sub_assign_job_idx  on public.subcontractor_assignments(job_id);
alter table public.subcontractor_assignments enable row level security;
drop policy if exists "sub assign self" on public.subcontractor_assignments;
create policy "sub assign self" on public.subcontractor_assignments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
