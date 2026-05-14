-- Plan 1 / A-15 — Map view: needs lat/lng on every geocodable record.
-- Adds nullable coordinates; geocoding runs lazily as records are
-- displayed. A future cron can batch-geocode older rows.

alter table public.leads
  add column if not exists lat numeric(9,6),
  add column if not exists lng numeric(9,6);

alter table public.jobs
  add column if not exists lat numeric(9,6),
  add column if not exists lng numeric(9,6);

alter table public.customers
  add column if not exists lat numeric(9,6),
  add column if not exists lng numeric(9,6);

create index if not exists leads_geocoded_idx     on public.leads     (lat, lng) where lat is not null;
create index if not exists jobs_geocoded_idx      on public.jobs      (lat, lng) where lat is not null;
create index if not exists customers_geocoded_idx on public.customers (lat, lng) where lat is not null;
