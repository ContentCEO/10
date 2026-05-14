-- AI-inferred trade category for each lead. Lets us slice the
-- pipeline by trade (roofing vs plumbing vs hvac, etc.) without
-- contractors having to manually tag.

alter table public.leads
  add column if not exists trade_tag text;

create index if not exists leads_trade_tag_idx on public.leads(trade_tag) where trade_tag is not null;
