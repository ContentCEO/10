-- Compliance items: insurance policies, contractor licenses, bonds,
-- worker's comp. Anything with an expiration date that, if it lapses,
-- gets the contractor in trouble.

create table if not exists public.compliance_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('insurance','license','bond','workers_comp','vehicle_reg','other')),
  name          text not null,
  number        text,
  issuer        text,
  expires_on    date not null,
  notes         text,
  file_url      text,
  created_at    timestamptz not null default now(),
  alerted_30d   boolean not null default false,
  alerted_7d    boolean not null default false,
  alerted_lapsed boolean not null default false
);
create index if not exists compliance_user_idx    on public.compliance_items(user_id);
create index if not exists compliance_expires_idx on public.compliance_items(expires_on);

alter table public.compliance_items enable row level security;
drop policy if exists "compliance self" on public.compliance_items;
create policy "compliance self" on public.compliance_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
