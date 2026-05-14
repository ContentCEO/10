-- Three-tier good/better/best proposals with shareable links + e-sign.

CREATE TABLE IF NOT EXISTS public.proposals (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id              UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  customer_id          UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  title                TEXT NOT NULL,
  intro                TEXT,
  terms                TEXT,
  tiers                JSONB NOT NULL DEFAULT '[]',  -- [{name, price_cents, summary, line_items: [{label, qty, unit_price_cents}]}]
  status               TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','viewed','signed','paid','rejected','expired')),
  share_token          TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  selected_tier_idx    INT,
  customer_signature   TEXT,
  customer_email       TEXT,
  customer_phone       TEXT,
  sent_at              TIMESTAMPTZ,
  viewed_at            TIMESTAMPTZ,
  signed_at            TIMESTAMPTZ,
  deposit_paid_cents   INT NOT NULL DEFAULT 0,
  financing_url        TEXT,
  expires_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proposals_user_idx ON public.proposals(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS proposals_status_idx ON public.proposals(status);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "proposals owner all" ON public.proposals;
CREATE POLICY "proposals owner all" ON public.proposals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public read access via share_token (used by /p/[token] page through the
-- admin client, but we keep RLS off the public flow).
