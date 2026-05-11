-- Lead source attribution + webhook dedupe
-- Run AFTER 2026-05-11_invoicing.sql.

do $$ begin
  create type lead_source_channel as enum (
    'google_ads',
    'meta_facebook',
    'meta_instagram',
    'website_form',
    'marketplace_form',
    'webhook',
    'manual',
    'scraped'
  );
exception when duplicate_object then null; end $$;

alter table public.marketplace_leads
  add column if not exists source_channel lead_source_channel
    not null default 'marketplace_form',
  add column if not exists external_id text,
  add column if not exists raw_payload jsonb;

create index if not exists marketplace_leads_source_idx
  on public.marketplace_leads(source_channel);

-- Prevents duplicate ingestion when an ad platform retries the same lead.
create unique index if not exists marketplace_leads_external_dedupe_idx
  on public.marketplace_leads(source_channel, external_id)
  where external_id is not null;
