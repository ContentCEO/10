-- Multi-role accounts: employees + customers + contractors
-- Run AFTER 2026-05-11_messaging.sql.

-- 1. Expand account_type to allow 'employee'.
alter table public.profiles
  drop constraint if exists profiles_account_type_check;
alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('homeowner', 'contractor', 'employee'));

-- 2. Employee invitation codes — a contractor generates a code, the employee
-- types it during signup to link to that business.
create table if not exists public.employee_invites (
  id           uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references auth.users(id) on delete cascade,
  code         text not null unique,
  email        text,
  role         text not null default 'crew',
  hourly_rate_cents int,
  expires_at   timestamptz not null default (now() + interval '14 days'),
  accepted_at  timestamptz,
  accepted_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists employee_invites_contractor_idx on public.employee_invites(contractor_id);
create unique index if not exists employee_invites_code_idx on public.employee_invites(code);

-- 3. Employment links — an employee profile linked to one or more contractors.
create table if not exists public.employee_links (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references auth.users(id) on delete cascade,
  contractor_id uuid not null references auth.users(id) on delete cascade,
  role          text not null default 'crew',
  hourly_rate_cents int,
  status        text not null default 'active'
    check (status in ('active', 'invited', 'suspended', 'removed')),
  created_at    timestamptz not null default now(),
  unique (employee_id, contractor_id)
);
create index if not exists employee_links_emp_idx on public.employee_links(employee_id);
create index if not exists employee_links_con_idx on public.employee_links(contractor_id);

-- 4. Time tracking — clock in/out per employee, optionally tied to a job.
create table if not exists public.time_entries (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references auth.users(id) on delete cascade,
  contractor_id uuid not null references auth.users(id) on delete cascade,
  job_id        uuid references public.jobs(id) on delete set null,
  clock_in_at   timestamptz not null default now(),
  clock_out_at  timestamptz,
  notes         text,
  created_at    timestamptz not null default now()
);
create index if not exists time_entries_emp_idx on public.time_entries(employee_id);
create index if not exists time_entries_open_idx on public.time_entries(employee_id) where clock_out_at is null;

-- 5. Daily tasks — assigned by contractor to employee, or self-created.
do $$ begin
  create type task_status as enum ('pending', 'in_progress', 'done', 'skipped');
exception when duplicate_object then null; end $$;

create table if not exists public.daily_tasks (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references auth.users(id) on delete cascade,
  employee_id   uuid references auth.users(id) on delete cascade,
  job_id        uuid references public.jobs(id) on delete set null,
  title         text not null,
  notes         text,
  due_at        timestamptz,
  status        task_status not null default 'pending',
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists daily_tasks_emp_idx on public.daily_tasks(employee_id);
create index if not exists daily_tasks_con_idx on public.daily_tasks(contractor_id);

-- 6. Job photos — before/after and progress documentation.
create table if not exists public.job_photos (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  job_id    uuid not null references public.jobs(id) on delete cascade,
  url       text not null,
  caption   text,
  phase     text check (phase in ('before', 'during', 'after') or phase is null),
  taken_at  timestamptz not null default now(),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists job_photos_job_idx on public.job_photos(job_id);

-- 7. RLS
alter table public.employee_invites enable row level security;
alter table public.employee_links   enable row level security;
alter table public.time_entries     enable row level security;
alter table public.daily_tasks      enable row level security;
alter table public.job_photos       enable row level security;

-- employee_invites: only the contractor can read/write.
drop policy if exists "invites owner all" on public.employee_invites;
create policy "invites owner all" on public.employee_invites
  for all using (auth.uid() = contractor_id) with check (auth.uid() = contractor_id);

-- employee_links: visible to both contractor and the linked employee.
drop policy if exists "links contractor read" on public.employee_links;
create policy "links contractor read" on public.employee_links
  for select using (auth.uid() = contractor_id);
drop policy if exists "links employee read" on public.employee_links;
create policy "links employee read" on public.employee_links
  for select using (auth.uid() = employee_id);
drop policy if exists "links contractor mutate" on public.employee_links;
create policy "links contractor mutate" on public.employee_links
  for all using (auth.uid() = contractor_id) with check (auth.uid() = contractor_id);

-- time_entries: contractor sees all of theirs; employee sees their own.
drop policy if exists "time contractor read" on public.time_entries;
create policy "time contractor read" on public.time_entries
  for select using (auth.uid() = contractor_id);
drop policy if exists "time employee all" on public.time_entries;
create policy "time employee all" on public.time_entries
  for all using (auth.uid() = employee_id) with check (auth.uid() = employee_id);

-- daily_tasks: contractor (owner) can do everything; employee can read and
-- update status of their assigned tasks.
drop policy if exists "tasks contractor all" on public.daily_tasks;
create policy "tasks contractor all" on public.daily_tasks
  for all using (auth.uid() = contractor_id) with check (auth.uid() = contractor_id);
drop policy if exists "tasks employee read" on public.daily_tasks;
create policy "tasks employee read" on public.daily_tasks
  for select using (auth.uid() = employee_id);
drop policy if exists "tasks employee update" on public.daily_tasks;
create policy "tasks employee update" on public.daily_tasks
  for update using (auth.uid() = employee_id) with check (auth.uid() = employee_id);

-- job_photos: contractor (owner of the job) can do everything; employees
-- linked to the same contractor can read/insert.
drop policy if exists "photos owner all" on public.job_photos;
create policy "photos owner all" on public.job_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "photos employee insert" on public.job_photos;
create policy "photos employee insert" on public.job_photos
  for insert with check (
    exists (
      select 1 from public.employee_links l
      where l.employee_id = auth.uid()
        and l.contractor_id = job_photos.user_id
        and l.status = 'active'
    )
  );
drop policy if exists "photos employee read" on public.job_photos;
create policy "photos employee read" on public.job_photos
  for select using (
    exists (
      select 1 from public.employee_links l
      where l.employee_id = auth.uid()
        and l.contractor_id = job_photos.user_id
        and l.status = 'active'
    )
  );

-- 8. Update the new-user trigger to accept 'employee' account_type.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  acct text;
begin
  acct := coalesce(new.raw_user_meta_data->>'account_type', 'contractor');
  if acct not in ('homeowner', 'contractor', 'employee') then
    acct := 'contractor';
  end if;
  insert into public.profiles (id, email, account_type)
  values (new.id, new.email, acct)
  on conflict (id) do nothing;
  return new;
end;
$$;
