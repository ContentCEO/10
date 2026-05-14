-- User-configurable RSS sources for the universal aggregator.

create table if not exists public.rss_sources (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  url          text not null unique,
  keywords     text[] not null default '{}',
  city         text,
  ai_score     int not null default 35 check (ai_score between 0 and 100),
  price_cents  int not null default 600,
  is_active    boolean not null default true,
  last_run_at  timestamptz,
  total_leads  int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists rss_sources_active_idx on public.rss_sources(is_active);
