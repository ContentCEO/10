-- Plan 1 / Section E / Idea #2 — E-signature on proposals.
--
-- Adds signature capture to proposals. The signature itself is stored as a
-- base64 data URL (small, ~5-15kb each) which is fine for short retention.
-- For a high-volume practice we'd swap to Supabase Storage; for v1 inline
-- is simpler and works without storage policies.

alter table public.proposals
  add column if not exists signed_at      timestamptz,
  add column if not exists signer_name    text,
  add column if not exists signer_email   text,
  add column if not exists signer_ip      text,
  add column if not exists signature_data text;

create index if not exists proposals_signed_idx on public.proposals (signed_at) where signed_at is not null;
