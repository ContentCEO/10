-- Tool / equipment tracking. What's checked out to which job and
-- when it's due back. Flag overdue items.

create table if not exists public.equipment (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  name               text not null,
  serial             text,
  purchase_cents     int not null default 0,
  status             text not null default 'available' check (status in ('available','checked_out','maintenance','lost')),
  checked_out_job_id uuid references public.jobs(id) on delete set null,
  due_back_at        timestamptz,
  notes              text,
  created_at         timestamptz not null default now()
);
create index if not exists equipment_user_idx     on public.equipment(user_id);
create index if not exists equipment_status_idx   on public.equipment(status);
create index if not exists equipment_due_back_idx on public.equipment(due_back_at) where status = 'checked_out';

alter table public.equipment enable row level security;
drop policy if exists "equipment self" on public.equipment;
create policy "equipment self" on public.equipment
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
