-- SMS opt-out tracker. When a customer replies STOP, we mark them
-- sms_opted_out and never send them another SMS until they reply START.

alter table public.customers
  add column if not exists sms_opted_out boolean not null default false,
  add column if not exists sms_opted_out_at timestamptz;

create index if not exists customers_sms_opt_idx on public.customers(sms_opted_out) where sms_opted_out = true;
