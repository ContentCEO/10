-- Auto-Outreach Engine — discover local-service businesses, scan them,
-- auto-generate a personalized website + ad strategy, and run multi-channel
-- outreach. Sub-system of ContractorFlow; owner-only surfaces.

-- =============================================================================
-- Prospects — businesses we've discovered & may pitch
-- =============================================================================
create table if not exists public.ao_prospects (
  id                    uuid primary key default gen_random_uuid(),

  -- Source / identity
  source                text not null default 'manual',  -- 'places' | 'manual' | 'csv'
  google_place_id       text unique,
  business_name         text not null,
  category              text,
  -- Free-text trade / niche, e.g. "HVAC", "Salon", "Dental"

  -- Contact
  phone                 text,
  email                 text,
  website_url           text,
  facebook_url          text,
  instagram_url         text,

  -- Location
  address               text,
  city                  text,
  state                 text,
  postal_code           text,
  country               text default 'US',
  lat                   double precision,
  lng                   double precision,

  -- Reviews / signal
  rating                numeric,
  review_count          integer,

  -- Pipeline status
  scan_status           text not null default 'pending',     -- pending | running | done | error
  scan_error            text,
  generate_status       text not null default 'pending',
  generate_error        text,
  outreach_status       text not null default 'pending',     -- pending | queued | sent | replied | converted | unsubscribed
  outreach_last_sent_at timestamptz,

  -- Lifecycle
  claimed_by_user_id    uuid references auth.users(id) on delete set null,
  claimed_at            timestamptz,
  do_not_contact        boolean not null default false,

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists ao_prospects_city_idx     on public.ao_prospects (city, state);
create index if not exists ao_prospects_category_idx on public.ao_prospects (category);
create index if not exists ao_prospects_status_idx   on public.ao_prospects (scan_status, generate_status, outreach_status);
create index if not exists ao_prospects_created_idx  on public.ao_prospects (created_at desc);

-- =============================================================================
-- Scans — structured snapshot of what we learned about a prospect
-- =============================================================================
create table if not exists public.ao_scans (
  id              uuid primary key default gen_random_uuid(),
  prospect_id     uuid not null references public.ao_prospects(id) on delete cascade,

  -- Raw scrapes
  website_html_size integer,
  website_title     text,
  website_meta_desc text,
  detected_services jsonb not null default '[]'::jsonb,
  detected_colors   jsonb not null default '[]'::jsonb,
  detected_logos    jsonb not null default '[]'::jsonb,

  -- Scoring (0-100 each)
  score_speed         integer,
  score_design        integer,
  score_seo           integer,
  score_conversion    integer,
  score_overall       integer,

  -- AI-generated narrative
  summary           text,
  weaknesses        jsonb not null default '[]'::jsonb,
  opportunities     jsonb not null default '[]'::jsonb,

  -- Competitor benchmarks
  competitors       jsonb not null default '[]'::jsonb,

  raw               jsonb,
  created_at        timestamptz not null default now()
);
create index if not exists ao_scans_prospect_idx on public.ao_scans (prospect_id, created_at desc);

-- =============================================================================
-- Generated sites — the actual landing page payload
-- =============================================================================
create table if not exists public.ao_sites (
  id              uuid primary key default gen_random_uuid(),
  prospect_id     uuid not null references public.ao_prospects(id) on delete cascade,
  slug            text not null unique,        -- e.g. "acme-plumbing-boston"
  template        text not null default 'classic-hero',

  -- Structured content rendered by the template
  content         jsonb not null default '{}'::jsonb,
  -- { hero: {headline, sub, cta}, services: [...], about, gallery, reviews,
  --   contact, faq, theme: {primary, accent, font} }

  -- Custom domain once they claim
  custom_domain   text,

  -- Live tracking
  view_count      integer not null default 0,
  unique_view_count integer not null default 0,
  last_viewed_at  timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists ao_sites_prospect_idx on public.ao_sites (prospect_id);

-- =============================================================================
-- Ad strategies — Google + Meta plans
-- =============================================================================
create table if not exists public.ao_ad_strategies (
  id              uuid primary key default gen_random_uuid(),
  prospect_id     uuid not null references public.ao_prospects(id) on delete cascade,
  platform        text not null,                        -- 'google' | 'meta'

  monthly_budget_low  integer,                          -- cents
  monthly_budget_high integer,
  target_audience     text,
  keywords            jsonb not null default '[]'::jsonb,
  ad_copy             jsonb not null default '[]'::jsonb,   -- [{headline, description}]
  landing_strategy    text,
  expected_cpl_low    integer,                          -- cents (cost per lead)
  expected_cpl_high   integer,
  rationale           text,
  raw                 jsonb,
  created_at          timestamptz not null default now()
);
create index if not exists ao_ads_prospect_idx on public.ao_ad_strategies (prospect_id, platform);

-- =============================================================================
-- Outreach campaigns + per-prospect message log
-- =============================================================================
create table if not exists public.ao_campaigns (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  channel       text not null,                          -- 'email' | 'sms'
  subject_tpl   text,
  body_tpl      text not null,
  -- Mustache-style: {{first_name}} {{business_name}} {{preview_url}} {{city}}
  status        text not null default 'draft',          -- draft | active | paused | done
  created_at    timestamptz not null default now()
);

create table if not exists public.ao_outreach_log (
  id            uuid primary key default gen_random_uuid(),
  prospect_id   uuid not null references public.ao_prospects(id) on delete cascade,
  campaign_id   uuid references public.ao_campaigns(id) on delete set null,
  channel       text not null,                          -- 'email' | 'sms'
  to_address    text not null,
  subject       text,
  body          text not null,
  status        text not null default 'queued',         -- queued | sent | failed | replied | clicked
  provider_id   text,
  error         text,
  sent_at       timestamptz,
  opened_at     timestamptz,
  clicked_at    timestamptz,
  replied_at    timestamptz,
  test_mode     boolean not null default false,
  created_at    timestamptz not null default now()
);
create index if not exists ao_outreach_prospect_idx on public.ao_outreach_log (prospect_id, created_at desc);
create index if not exists ao_outreach_status_idx   on public.ao_outreach_log (status, created_at desc);

-- =============================================================================
-- Subscriptions — link prospect → paid claim / SaaS plan
-- =============================================================================
create table if not exists public.ao_subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  prospect_id           uuid not null references public.ao_prospects(id) on delete cascade,
  user_id               uuid references auth.users(id) on delete set null,
  plan                  text not null,                  -- 'one_time' | 'monthly' | 'ad_management'
  status                text not null default 'pending',-- pending | active | canceled | past_due
  stripe_customer_id    text,
  stripe_subscription_id text,
  stripe_session_id     text,
  amount_cents          integer,
  currency              text default 'usd',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists ao_subs_prospect_idx on public.ao_subscriptions (prospect_id);

-- =============================================================================
-- RLS — everything is service-role only by default. Owner UI uses admin client.
-- Public site reads ao_sites by slug via service-role API route, never directly.
-- =============================================================================
alter table public.ao_prospects      enable row level security;
alter table public.ao_scans          enable row level security;
alter table public.ao_sites          enable row level security;
alter table public.ao_ad_strategies  enable row level security;
alter table public.ao_campaigns      enable row level security;
alter table public.ao_outreach_log   enable row level security;
alter table public.ao_subscriptions  enable row level security;

-- Owners (is_admin) can read/write everything via their own session if needed.
do $$ begin
  create policy "ao_prospects admin all" on public.ao_prospects
    for all using (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
    ) with check (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ao_scans admin all" on public.ao_scans for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ao_sites admin all" on public.ao_sites for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ao_ad_strategies admin all" on public.ao_ad_strategies for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ao_campaigns admin all" on public.ao_campaigns for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ao_outreach_log admin all" on public.ao_outreach_log for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ao_subscriptions admin all" on public.ao_subscriptions for all
    using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true))
    with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true));
exception when duplicate_object then null; end $$;
