-- Two-sided marketplace: contractor accounts (default) and homeowner accounts.
-- Run this AFTER the wallet migration.

alter table public.profiles
  add column if not exists account_type text not null default 'contractor'
  check (account_type in ('homeowner', 'contractor'));

-- Update the new-user trigger to honor account_type from signup metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  acct text;
begin
  acct := coalesce(new.raw_user_meta_data->>'account_type', 'contractor');
  if acct not in ('homeowner', 'contractor') then
    acct := 'contractor';
  end if;
  insert into public.profiles (id, email, account_type)
  values (new.id, new.email, acct)
  on conflict (id) do nothing;
  return new;
end;
$$;
