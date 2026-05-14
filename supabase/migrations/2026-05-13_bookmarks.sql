-- Bookmarks / pins for quick access. Star anything — a customer, a
-- job, a lead, an invoice — and it shows up in your sidebar
-- "Pinned" rail.

create table if not exists public.bookmarks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  kind         text not null check (kind in ('lead','job','customer','invoice','proposal','page')),
  target_id    text not null,
  label        text not null,
  href         text not null,
  created_at   timestamptz not null default now(),
  unique (user_id, kind, target_id)
);
create index if not exists bookmarks_user_idx on public.bookmarks(user_id);

alter table public.bookmarks enable row level security;
drop policy if exists "bookmarks self" on public.bookmarks;
create policy "bookmarks self" on public.bookmarks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
