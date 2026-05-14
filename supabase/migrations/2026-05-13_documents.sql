-- Document vault. W-9s, certificates of insurance, contracts, signed
-- proposals (archived copies), tax docs. Stores a URL (or storage path)
-- + metadata.

create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('w9','insurance','license','contract','tax','receipt','other')),
  name          text not null,
  url           text not null,
  customer_id   uuid references public.customers(id) on delete set null,
  job_id        uuid references public.jobs(id) on delete set null,
  size_bytes    int,
  uploaded_at   timestamptz not null default now()
);
create index if not exists docs_user_idx on public.documents(user_id);
create index if not exists docs_kind_idx on public.documents(kind);

alter table public.documents enable row level security;
drop policy if exists "documents self" on public.documents;
create policy "documents self" on public.documents
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
