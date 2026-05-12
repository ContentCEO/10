-- Intake form for users requesting hands-on marketing/sales help from us.
-- /marketing-hub → "Connect with our team" → writes a row here.

CREATE TABLE IF NOT EXISTS public.marketing_intakes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  needs        TEXT[] NOT NULL DEFAULT '{}',
  budget       TEXT,
  phone        TEXT,
  notes        TEXT,
  status       TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','in_progress','closed','disqualified')),
  assigned_to  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS marketing_intakes_user_idx ON public.marketing_intakes(user_id);
CREATE INDEX IF NOT EXISTS marketing_intakes_status_idx ON public.marketing_intakes(status, created_at DESC);

ALTER TABLE public.marketing_intakes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "intakes self read" ON public.marketing_intakes;
CREATE POLICY "intakes self read" ON public.marketing_intakes
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "intakes self write" ON public.marketing_intakes;
CREATE POLICY "intakes self write" ON public.marketing_intakes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
