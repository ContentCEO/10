-- Super-admin flag on profiles. Set TRUE for the owner account so they
-- can access /admin.
alter table public.profiles
  add column if not exists is_admin boolean not null default false;
