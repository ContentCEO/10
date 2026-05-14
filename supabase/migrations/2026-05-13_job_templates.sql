-- Job templates: pre-set scope of work + default price + default
-- estimated duration. Used to spawn new jobs quickly.

create table if not exists public.job_templates (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  description   text,
  default_price numeric(10,2),
  default_duration_days int,
  trade         text,
  use_count     int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists job_templates_user_idx on public.job_templates(user_id);

alter table public.job_templates enable row level security;
drop policy if exists "job_templates self" on public.job_templates;
create policy "job_templates self" on public.job_templates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
