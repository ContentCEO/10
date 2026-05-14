-- Per-contractor notification preferences for new-lead alerts.
-- Run AFTER 2026-05-11_wave9_platform.sql.

alter table public.profiles
  add column if not exists notify_email   boolean not null default true,
  add column if not exists notify_push    boolean not null default true,
  add column if not exists notify_webhook boolean not null default true,
  add column if not exists notify_sms     boolean not null default false;
