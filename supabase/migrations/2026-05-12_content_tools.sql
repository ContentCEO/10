-- Three content tools sharing one migration:
--   job_photos       — before/after image library tied to jobs
--   blog_posts       — local-SEO blog post drafts
--   gbp_posts        — Google Business Profile post drafts

CREATE TABLE IF NOT EXISTS public.job_photos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id      UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('before','after','progress','other')),
  url         TEXT NOT NULL,
  caption     TEXT,
  service     TEXT,
  city        TEXT,
  ai_caption  TEXT,
  ai_hashtags TEXT[] DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_photos_user_idx ON public.job_photos(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS job_photos_job_idx ON public.job_photos(job_id);

ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "photos owner all" ON public.job_photos;
CREATE POLICY "photos owner all" ON public.job_photos
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS public.blog_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL,
  service     TEXT,
  city        TEXT,
  body_md     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','published','archived')),
  published_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug)
);
CREATE INDEX IF NOT EXISTS blog_posts_user_idx ON public.blog_posts(user_id, created_at DESC);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blog owner all" ON public.blog_posts;
CREATE POLICY "blog owner all" ON public.blog_posts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "blog public read" ON public.blog_posts;
CREATE POLICY "blog public read" ON public.blog_posts
  FOR SELECT USING (status = 'published');


CREATE TABLE IF NOT EXISTS public.gbp_posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'update'
    CHECK (kind IN ('update','offer','event','product')),
  title       TEXT,
  body        TEXT NOT NULL,
  cta_label   TEXT,
  cta_url     TEXT,
  status      TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','posted','archived')),
  posted_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gbp_posts_user_idx ON public.gbp_posts(user_id, created_at DESC);

ALTER TABLE public.gbp_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gbp owner all" ON public.gbp_posts;
CREATE POLICY "gbp owner all" ON public.gbp_posts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
