-- Material unit-price tracking. Log what materials cost when, see
-- trends, get alerts when prices jump.
--
-- One row per purchase event. Aggregations done in the view layer.

create table if not exists public.material_prices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  sku          text,
  name         text not null,
  unit         text not null default 'each',
  unit_price_cents int not null check (unit_price_cents >= 0),
  qty          numeric(10,2),
  vendor       text,
  job_id       uuid references public.jobs(id) on delete set null,
  bought_at    date not null default current_date,
  notes        text,
  created_at   timestamptz not null default now()
);
create index if not exists material_prices_user_idx     on public.material_prices(user_id);
create index if not exists material_prices_name_idx     on public.material_prices(user_id, lower(name));
create index if not exists material_prices_bought_idx   on public.material_prices(bought_at desc);

alter table public.material_prices enable row level security;
drop policy if exists "material_prices self" on public.material_prices;
create policy "material_prices self" on public.material_prices
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
