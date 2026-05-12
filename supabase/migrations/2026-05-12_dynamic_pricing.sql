-- Dynamic AI pricing for scraped marketplace leads.
-- Replaces the trigger so the same function handles both curation flag
-- AND price computation.
--
-- Pricing model:
--   base = AI score band ($3 - $50)
--   × source_multiplier (federal 1.5x, permits 1.2x, storms 0.6x)
--   × budget_multiplier (over_50k 1.5x, under_5k 0.7x)
--   clamped to $1-$100

CREATE OR REPLACE FUNCTION public.compute_lead_price(
  p_ai_score INT,
  p_budget TEXT,
  p_external_id TEXT
) RETURNS INT AS $$
DECLARE
  base_cents INT;
  source_mult NUMERIC := 1.0;
  budget_mult NUMERIC := 1.0;
BEGIN
  -- Base by AI score
  IF p_ai_score >= 90 THEN base_cents := 5000;
  ELSIF p_ai_score >= 80 THEN base_cents := 3000;
  ELSIF p_ai_score >= 70 THEN base_cents := 2000;
  ELSIF p_ai_score >= 60 THEN base_cents := 1200;
  ELSIF p_ai_score >= 50 THEN base_cents := 800;
  ELSE base_cents := 300;
  END IF;

  -- Source multiplier from external_id prefix
  IF p_external_id LIKE 'samgov:%' THEN
    source_mult := 1.5;
  ELSIF p_external_id LIKE 'bid:%' THEN
    source_mult := 1.4;
  ELSIF p_external_id LIKE 'boston:%'
     OR p_external_id LIKE 'nyc:%'
     OR p_external_id LIKE 'la:%'
     OR p_external_id LIKE 'sf:%'
     OR p_external_id LIKE 'seattle:%'
     OR p_external_id LIKE 'austin:%'
     OR p_external_id LIKE 'dallas:%'
     OR p_external_id LIKE 'chicago:%'
     OR p_external_id LIKE 'dc:%'
     OR p_external_id LIKE 'detroit:%'
     OR p_external_id LIKE 'cambridge:%'
     OR p_external_id LIKE 'somerville:%'
     OR p_external_id LIKE 'lowell:%'
  THEN
    source_mult := 1.2;
  ELSIF p_external_id LIKE 'nws:%' THEN
    source_mult := 0.6;
  ELSIF p_external_id LIKE 'cl:%' THEN
    source_mult := 1.0;
  END IF;

  -- Budget multiplier
  CASE p_budget
    WHEN 'over_50k' THEN budget_mult := 1.5;
    WHEN '15k_50k' THEN budget_mult := 1.2;
    WHEN 'under_5k' THEN budget_mult := 0.7;
    WHEN 'unsure' THEN budget_mult := 0.9;
    ELSE budget_mult := 1.0;
  END CASE;

  RETURN GREATEST(100, LEAST(10000, ROUND(base_cents * source_mult * budget_mult)::INT));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Replace the trigger function to handle BOTH curation + pricing
CREATE OR REPLACE FUNCTION public.set_curation_flag()
RETURNS trigger AS $$
DECLARE
  threshold INT := 0;
BEGIN
  -- Only act on scraped leads
  IF NEW.source_channel = 'scraped' THEN
    -- Compute dynamic price (overrides whatever the scraper set)
    NEW.price_cents := public.compute_lead_price(
      NEW.ai_score,
      NEW.budget::TEXT,
      COALESCE(NEW.external_id, '')
    );

    -- Find owner's auto-approve threshold (admin user)
    SELECT auto_approve_score_threshold INTO threshold
    FROM public.profiles
    WHERE is_admin = true
    ORDER BY created_at ASC
    LIMIT 1;
    threshold := COALESCE(threshold, 0);

    -- Flag for curation unless auto-approve threshold met
    IF threshold > 0 AND NEW.ai_score >= threshold THEN
      NEW.requires_curation := false;
    ELSE
      NEW.requires_curation := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger itself already created by 2026-05-12_lead_curation.sql, no need
-- to recreate; the function replacement is what changes the behavior.
