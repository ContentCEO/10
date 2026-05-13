-- Customer portal: each customer gets a unique share token, used in the
-- /portal/[token] public route to view their open jobs, proposals, and
-- invoices. Like a magic link, but persistent — the contractor copies
-- the link from the customer detail page and texts/emails it.

alter table public.customers
  add column if not exists portal_token text unique;

-- Backfill any existing rows.
update public.customers
  set portal_token = replace(gen_random_uuid()::text, '-', '')
  where portal_token is null;

-- New rows get one by default.
alter table public.customers
  alter column portal_token set default replace(gen_random_uuid()::text, '-', '');

create index if not exists customers_portal_token_idx on public.customers(portal_token);
