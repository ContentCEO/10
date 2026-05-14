-- Discrete tasks under a job. Lets crew check off steps as they go,
-- and gives the owner visibility into progress without asking.

create table if not exists public.job_tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  job_id       uuid not null references public.jobs(id) on delete cascade,
  title        text not null,
  is_done      boolean not null default false,
  done_at      timestamptz,
  done_by      uuid references auth.users(id) on delete set null,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists job_tasks_job_idx on public.job_tasks(job_id);
create index if not exists job_tasks_user_idx on public.job_tasks(user_id);

alter table public.job_tasks enable row level security;
drop policy if exists "job_tasks self" on public.job_tasks;
create policy "job_tasks self" on public.job_tasks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
