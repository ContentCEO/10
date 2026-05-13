-- Plan 1 / E-12 — Change-order workflow.
--
-- Every mid-job scope change deserves a signed paper trail. This table
-- captures: who, what, how much, when, signed.

create table if not exists public.change_orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  job_id          uuid,
  number          int  not null default 1,           -- per-job sequence
  reason          text not null,
  scope_change    text not null,
  price_delta_cents int not null default 0,           -- + for additions, − for credits
  timeline_delta_days int not null default 0,
  share_token     text unique not null default replace(gen_random_uuid()::text, '-', ''),
  status          text not null default 'draft' check (status in ('draft','sent','signed','rejected','canceled')),
  signed_at       timestamptz,
  signer_name     text,
  signer_ip       text,
  signature_data  text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists change_orders_user_idx on public.change_orders (user_id, created_at desc);
create index if not exists change_orders_job_idx  on public.change_orders (job_id, number);
