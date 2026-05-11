-- Contractor public directory: profile fields, credentials, photos, reviews.
-- Run AFTER 2026-05-11_account_type.sql.

-- 1. Extend profiles with directory fields.
alter table public.profiles
  add column if not exists headline         text,
  add column if not exists bio              text,
  add column if not exists services         text[] not null default '{}',
  add column if not exists service_zips     text[] not null default '{}',
  add column if not exists service_cities   text[] not null default '{}',
  add column if not exists years_in_business int,
  add column if not exists phone_public     text,
  add column if not exists website          text,
  add column if not exists logo_url         text,
  add column if not exists hero_image_url   text,
  add column if not exists is_published     boolean not null default false;

-- Allow public read of *published contractor* profiles, on top of the existing
-- self-read policy (Postgres unions multiple SELECT policies with OR).
drop policy if exists "profiles public published read" on public.profiles;
create policy "profiles public published read" on public.profiles
  for select using (
    account_type = 'contractor' and is_published = true
  );

-- 2. Credentials (license, insurance, certifications).
create table if not exists public.contractor_credentials (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('license', 'insurance', 'certification', 'bonded')),
  name          text not null,
  number        text,
  issuer        text,
  expires_at    date,
  document_url  text,
  created_at    timestamptz not null default now()
);
create index if not exists contractor_creds_owner_idx on public.contractor_credentials(contractor_id);

-- 3. Portfolio photos (URLs only — no Storage uploads in this MVP).
create table if not exists public.contractor_photos (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references auth.users(id) on delete cascade,
  url           text not null,
  caption       text,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists contractor_photos_owner_idx on public.contractor_photos(contractor_id);

-- 4. Reviews / testimonials.
create table if not exists public.contractor_reviews (
  id            uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text not null,
  rating        int not null check (rating between 1 and 5),
  title         text,
  body          text not null,
  project_type  text,
  verified      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists contractor_reviews_owner_idx on public.contractor_reviews(contractor_id);

-- 5. RLS — owners can do everything, public can read rows that belong to a
-- published contractor.
alter table public.contractor_credentials enable row level security;
alter table public.contractor_photos      enable row level security;
alter table public.contractor_reviews     enable row level security;

do $$
declare t text;
begin
  foreach t in array array['contractor_credentials','contractor_photos','contractor_reviews'] loop
    execute format('drop policy if exists "%1$s owner all" on public.%1$s;', t);
    execute format(
      'create policy "%1$s owner all" on public.%1$s
         for all using (auth.uid() = contractor_id)
         with check (auth.uid() = contractor_id);',
      t
    );
    execute format('drop policy if exists "%1$s public read" on public.%1$s;', t);
    execute format(
      'create policy "%1$s public read" on public.%1$s
         for select using (
           exists (
             select 1 from public.profiles p
             where p.id = %1$s.contractor_id
               and p.account_type = ''contractor''
               and p.is_published = true
           )
         );',
      t
    );
  end loop;
end $$;
