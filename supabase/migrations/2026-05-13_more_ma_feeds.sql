-- Plan 1 / C-3, C-4, C-9, C-12 — More MA-specific lead-gen feeds.
-- Idempotent via UNIQUE (url) constraint on rss_sources.

INSERT INTO public.rss_sources (name, url, keywords, city, ai_score, price_cents)
VALUES
  -- ── C-3 MassWildfire / damage maps ─────────────────────────────────────
  ('MEMA · Mass Emergency Management Agency',
   'https://www.mass.gov/orgs/massachusetts-emergency-management-agency/news.rss',
   ARRAY['emergency','damage','disaster','recovery','flood','storm','fire','rebuild'],
   NULL, 60, 1800),
  ('FEMA · Region 1 (New England) news',
   'https://www.fema.gov/feeds/region1.atom',
   ARRAY['disaster','damage','grant','rebuild','flood','hurricane','recovery'],
   NULL, 55, 1500),

  -- ── C-4 HOA newsletter feeds (regional aggregators where available) ───
  ('Boston Properties · investor news',
   'https://www.bxp.com/investors/news/feed',
   ARRAY['construction','renovation','expansion','tenant','build-out'],
   'Boston', 45, 1500),
  ('CommonGround MA · condo board news',
   'https://www.commongroundma.org/feed',
   ARRAY['renovation','assessment','repair','project','contractor'],
   NULL, 40, 1200),

  -- ── C-9 Insurance claim publications ───────────────────────────────────
  ('NAIC consumer alerts',
   'https://content.naic.org/rss/cipr.xml',
   ARRAY['claim','damage','rebuild','restoration','assessment','adjuster'],
   NULL, 45, 1400),
  ('MA Division of Insurance · news',
   'https://www.mass.gov/orgs/division-of-insurance/news.rss',
   ARRAY['claim','damage','rebuild','restoration','assessment','property'],
   NULL, 45, 1400),

  -- ── C-12 BBB MA complaints + scams (signal of contractor-needed homes) ─
  ('BBB Scam Tracker',
   'https://www.bbb.org/scamtracker/rss',
   ARRAY['contractor','home','repair','unfinished','abandoned','dispute','complaint'],
   NULL, 50, 1500),

  -- ── C-13 MA DPH lead-paint orders ──────────────────────────────────────
  ('MA DPH · Childhood Lead Poisoning Prevention',
   'https://www.mass.gov/orgs/childhood-lead-poisoning-prevention-program/news.rss',
   ARRAY['lead','abatement','order','remediation','compliance','property'],
   NULL, 60, 2200),

  -- ── Construction-defect class action feed ──────────────────────────────
  ('Top Class Actions · Construction & Property',
   'https://topclassactions.com/category/construction-defect/feed/',
   ARRAY['class action','defect','settlement','repair','damages','homeowner'],
   NULL, 50, 1500),

  -- ── Real estate transfer publications (NE) ─────────────────────────────
  ('Banker & Tradesman · MA real estate',
   'https://www.bankerandtradesman.com/feed/',
   ARRAY['transfer','sale','property','condo','renovation','permit','construction'],
   NULL, 50, 1500),
  ('Boston Real Estate Times',
   'https://bostonrealestatetimes.com/feed/',
   ARRAY['sale','transfer','property','renovation','permit','construction'],
   'Boston', 45, 1300),

  -- ── Local MA city press releases (additional coverage) ─────────────────
  ('City of Boston · news',
   'https://www.boston.gov/news.rss',
   ARRAY['construction','renovation','permit','project','rfp','street','sidewalk'],
   'Boston', 50, 1500),
  ('City of Worcester · news',
   'https://www.worcesterma.gov/news.rss',
   ARRAY['construction','renovation','permit','project','rfp'],
   'Worcester', 45, 1300),
  ('City of Springfield · news',
   'https://www.springfield-ma.gov/news.rss',
   ARRAY['construction','renovation','permit','project','rfp'],
   'Springfield', 45, 1300),

  -- ── NWS / NOAA storm products (general atmospheric monitoring) ─────────
  ('NWS Boston · all hazards',
   'https://forecast.weather.gov/wwamap/wwarssget.php?cwa=BOX',
   ARRAY['warning','watch','severe','storm','wind','hail','flood','tornado'],
   'Boston', 55, 1600)
ON CONFLICT (url) DO NOTHING;
