-- Drip sequences (multi-step lead nurture) + seasonal customer campaigns.
-- Both work on top of the existing follow_ups table; the daily cron already
-- dispatches due follow_ups via AI.

-- 1. Drip sequence templates
CREATE TABLE IF NOT EXISTS public.drip_sequences (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  description  TEXT,
  steps        JSONB NOT NULL DEFAULT '[]',  -- [{delay_days, channel, prompt}, ...]
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drip_sequences_user_idx ON public.drip_sequences(user_id);

ALTER TABLE public.drip_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drip_sequences owner all" ON public.drip_sequences;
CREATE POLICY "drip_sequences owner all" ON public.drip_sequences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Lead enrollments
CREATE TABLE IF NOT EXISTS public.drip_enrollments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id      UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sequence_id  UUID NOT NULL REFERENCES public.drip_sequences(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','paused','completed','stopped')),
  current_step INT NOT NULL DEFAULT 0,
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE (lead_id, sequence_id)
);
CREATE INDEX IF NOT EXISTS drip_enrollments_user_idx ON public.drip_enrollments(user_id);
CREATE INDEX IF NOT EXISTS drip_enrollments_lead_idx ON public.drip_enrollments(lead_id);

ALTER TABLE public.drip_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drip_enrollments owner all" ON public.drip_enrollments;
CREATE POLICY "drip_enrollments owner all" ON public.drip_enrollments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Sequence + step linkage on follow_ups so we can stop all pending steps
-- when a lead replies.
ALTER TABLE public.follow_ups
  ADD COLUMN IF NOT EXISTS sequence_id UUID REFERENCES public.drip_sequences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sequence_step INT;

-- 4. Seasonal campaigns (run on calendar dates against the customer book)
CREATE TABLE IF NOT EXISTS public.seasonal_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  trigger_month   INT NOT NULL CHECK (trigger_month BETWEEN 1 AND 12),
  trigger_day     INT NOT NULL CHECK (trigger_day BETWEEN 1 AND 31),
  target_services TEXT[] DEFAULT '{}',  -- empty = all customers
  prompt          TEXT NOT NULL,        -- AI prompt context for the message
  is_active       BOOLEAN NOT NULL DEFAULT true,
  last_run_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seasonal_campaigns_user_idx ON public.seasonal_campaigns(user_id);

ALTER TABLE public.seasonal_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seasonal owner all" ON public.seasonal_campaigns;
CREATE POLICY "seasonal owner all" ON public.seasonal_campaigns
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
