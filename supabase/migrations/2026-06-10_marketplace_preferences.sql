-- Per-contractor lead delivery preferences for the Marketplace module.
-- Each contractor on cf-marketplace has one row; the marketplace UI honors
-- these filters when listing available leads + when firing SMS/email alerts.

create table if not exists public.marketplace_preferences (
  user_id           uuid primary key references auth.users(id) on delete cascade,
  trades            text[] not null default '{}',          -- ["roofing","siding"], empty = all
  zips              text[] not null default '{}',          -- ["02148","02150"], empty = all
  min_budget_cents  bigint not null default 0,             -- 0 = no minimum
  max_distance_mi   int    not null default 50,            -- from primary service address
  sms_enabled       boolean not null default true,
  email_enabled     boolean not null default true,
  push_enabled      boolean not null default true,
  daily_digest      boolean not null default false,        -- "give me a 7am summary instead of real-time"
  weekly_digest     boolean not null default false,
  paused_until      timestamptz,                            -- snooze without unsubscribing
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists marketplace_prefs_trades_idx
  on public.marketplace_preferences using gin(trades);
create index if not exists marketplace_prefs_zips_idx
  on public.marketplace_preferences using gin(zips);

create or replace function public.marketplace_preferences_touch()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists marketplace_prefs_touch_trg on public.marketplace_preferences;
create trigger marketplace_prefs_touch_trg
  before update on public.marketplace_preferences
  for each row execute function public.marketplace_preferences_touch();

alter table public.marketplace_preferences enable row level security;

-- Owner-only read/write on their own preferences.
drop policy if exists prefs_owner_select on public.marketplace_preferences;
create policy prefs_owner_select on public.marketplace_preferences
  for select using (auth.uid() = user_id);

drop policy if exists prefs_owner_upsert on public.marketplace_preferences;
create policy prefs_owner_upsert on public.marketplace_preferences
  for insert with check (auth.uid() = user_id);

drop policy if exists prefs_owner_update on public.marketplace_preferences;
create policy prefs_owner_update on public.marketplace_preferences
  for update using (auth.uid() = user_id);
