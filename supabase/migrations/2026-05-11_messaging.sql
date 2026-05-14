-- Outbound messaging log (Twilio SMS + Resend email)
-- Run AFTER 2026-05-11_lead_scoring.sql.

do $$ begin
  create type message_channel as enum ('sms', 'email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_status as enum ('queued', 'sent', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

create table if not exists public.message_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  lead_id       uuid references public.leads(id) on delete set null,
  customer_id   uuid references public.customers(id) on delete set null,
  follow_up_id  uuid references public.follow_ups(id) on delete set null,
  channel       message_channel not null,
  to_address    text not null,
  subject       text,
  body          text not null,
  status        message_status not null default 'queued',
  provider_id   text,
  error         text,
  sent_at       timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists message_log_user_idx on public.message_log(user_id);
create index if not exists message_log_lead_idx on public.message_log(lead_id);
create index if not exists message_log_followup_idx on public.message_log(follow_up_id);

alter table public.message_log enable row level security;
drop policy if exists "message log owner read" on public.message_log;
create policy "message log owner read" on public.message_log
  for select using (auth.uid() = user_id);

-- Flip on auto-dispatch per-user. Default off so existing users aren't
-- surprised by a phone bill the day they connect Twilio.
alter table public.profiles
  add column if not exists auto_dispatch_enabled boolean not null default false;
