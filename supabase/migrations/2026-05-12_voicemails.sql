-- Voicemail inbox. Twilio (or another voice provider) posts call recordings
-- + transcripts here. Each row is rendered on /voicemails with an AI summary
-- and one-click "send callback" button.

CREATE TABLE IF NOT EXISTS public.voicemails (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_sid            TEXT UNIQUE,
  from_phone          TEXT NOT NULL,
  to_phone            TEXT,
  recording_url       TEXT,
  duration_sec        INT,
  transcription       TEXT,
  ai_summary          TEXT,
  ai_suggested_reply  TEXT,
  status              TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','replied','archived')),
  replied_at          TIMESTAMPTZ,
  matched_lead_id     UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS voicemails_user_idx
  ON public.voicemails(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS voicemails_status_idx
  ON public.voicemails(status) WHERE status = 'new';

ALTER TABLE public.voicemails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "voicemails owner all" ON public.voicemails;
CREATE POLICY "voicemails owner all" ON public.voicemails
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
