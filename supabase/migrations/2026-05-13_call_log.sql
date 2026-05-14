-- Manual phone call log. Quick capture for calls that didn't come
-- through Twilio (cold calls, voicemails back to a lead, etc).

create table if not exists public.call_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  lead_id         uuid references public.leads(id) on delete set null,
  customer_id     uuid references public.customers(id) on delete set null,
  direction       text not null check (direction in ('outbound', 'inbound')),
  outcome         text not null check (outcome in ('connected', 'voicemail', 'no_answer', 'wrong_number', 'callback_scheduled', 'not_interested')),
  notes           text,
  duration_min    int,
  called_at       timestamptz not null default now()
);
create index if not exists call_log_user_idx     on public.call_log(user_id);
create index if not exists call_log_lead_idx     on public.call_log(lead_id);
create index if not exists call_log_customer_idx on public.call_log(customer_id);

alter table public.call_log enable row level security;
drop policy if exists "call_log self" on public.call_log;
create policy "call_log self" on public.call_log
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
