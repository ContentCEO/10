-- Lead curation: scraped leads are held in a pending state until the owner
-- approves them. This is admin-only — regular contractors never see leads
-- that haven't been curated.

ALTER TABLE public.marketplace_leads
  ADD COLUMN IF NOT EXISTS requires_curation BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS curated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS curated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS marketplace_leads_curation_pending_idx
  ON public.marketplace_leads(created_at DESC) WHERE requires_curation = true;

-- Trigger: any insert with source_channel='scraped' is automatically marked
-- as requiring curation. This means we don't have to update every individual
-- scraper file — the trigger handles it.
CREATE OR REPLACE FUNCTION public.set_curation_flag()
RETURNS trigger AS $$
BEGIN
  IF NEW.source_channel = 'scraped' AND NEW.requires_curation IS DISTINCT FROM true THEN
    NEW.requires_curation = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketplace_leads_curation_trg ON public.marketplace_leads;
CREATE TRIGGER marketplace_leads_curation_trg
  BEFORE INSERT ON public.marketplace_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_curation_flag();

-- Owner-only auto-approval threshold. If AI score >= threshold, scraped
-- leads bypass curation. Default 0 = curate everything.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_approve_score_threshold INT NOT NULL DEFAULT 0
    CHECK (auto_approve_score_threshold BETWEEN 0 AND 100);
