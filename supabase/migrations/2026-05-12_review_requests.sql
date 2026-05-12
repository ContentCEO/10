-- Auto-review-request engine. When a job is marked completed, schedule a
-- review request to send 2 hours later (sweet spot — fresh enough to be
-- accurate, late enough that the work is actually done).

CREATE TABLE IF NOT EXISTS public.review_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id     UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  job_id          UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  channel         TEXT NOT NULL CHECK (channel IN ('sms','email','both')),
  send_at         TIMESTAMPTZ NOT NULL,
  sent_at         TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,    -- when customer clicks the review link
  reviewed_at     TIMESTAMPTZ,    -- when they actually leave a review
  star_rating     INT CHECK (star_rating BETWEEN 1 AND 5),
  review_text     TEXT,
  review_platform TEXT CHECK (review_platform IN ('google','yelp','facebook','internal')),
  status          TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','sent','failed','cancelled','completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_requests_user_idx
  ON public.review_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS review_requests_due_idx
  ON public.review_requests(send_at) WHERE status = 'scheduled';

ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "review_requests owner all" ON public.review_requests;
CREATE POLICY "review_requests owner all" ON public.review_requests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger: when a job is set to status='completed' AND review_requests doesn't
-- already exist for it, auto-schedule a review request 2 hours later.
CREATE OR REPLACE FUNCTION public.auto_schedule_review_request()
RETURNS trigger AS $$
DECLARE
  enabled BOOLEAN := true;
BEGIN
  IF NEW.status = 'completed'
     AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'completed')
     AND NEW.customer_id IS NOT NULL THEN

    SELECT COALESCE(auto_review_requests_enabled, true) INTO enabled
    FROM public.profiles WHERE id = NEW.user_id;

    IF enabled THEN
      INSERT INTO public.review_requests (
        user_id, customer_id, job_id, channel, send_at, status
      ) VALUES (
        NEW.user_id, NEW.customer_id, NEW.id, 'both',
        now() + interval '2 hours', 'scheduled'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS jobs_completed_review_trg ON public.jobs;
CREATE TRIGGER jobs_completed_review_trg
  AFTER INSERT OR UPDATE OF status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.auto_schedule_review_request();

-- Profile opt-in flag (defaults to true once column exists)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auto_review_requests_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS yelp_review_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_review_url TEXT;
