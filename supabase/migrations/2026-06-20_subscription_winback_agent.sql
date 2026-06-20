-- Seed the Subscription Win-Back agent.
--
-- The original roster lives in 2026-05-12_ai_agents.sql, but that migration
-- has already run on existing databases, so its INSERT won't pick up new
-- agents. This migration registers subscription-winback idempotently for
-- databases that already have the agents table.

insert into public.agents (slug, name, description, category, cadence_minutes, config) values
  ('subscription-winback',  'Subscription Win-Back',
   'Protects MRR: catches ContractorFlow trials ending soon, payments that failed (past_due), and recent cancellations, then drafts a tailored SMS + email to retain or win back the customer. Owner approves before send.',
   'sales', 720, '{"trial_warn_days":3,"winback_grace_days":30,"redraft_cooldown_days":14}'::jsonb)
on conflict (slug) do nothing;
