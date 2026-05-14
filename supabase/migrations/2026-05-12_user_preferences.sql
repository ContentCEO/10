-- Flexible JSONB preferences column for end-user customization:
--   theme        — 'light' | 'dark' | 'system'
--   density      — 'comfortable' | 'compact'
--   ai_tone      — 'formal' | 'friendly' | 'casual' | 'direct'
--   sidebar_collapsed_default — boolean
--   marketplace_min_score      — int 0..100, filter low-score leads
--   marketplace_services       — text[], only show these services
--   marketplace_regions        — text[], only show leads from these cities
--
-- Single column keeps schema small; new fields don't require a migration.

alter table public.profiles
  add column if not exists preferences jsonb not null default '{}'::jsonb;
