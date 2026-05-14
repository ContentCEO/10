-- Plan 1 / Section C / Idea #1 — MA hospital + university capital plans.
-- Plan 1 / Section C / Idea #4 — HOA newsletter RSS (where syndicated).
--
-- Public RSS feeds from institutional capital-projects offices + facilities
-- announcements. These are high-value: every project means subcontractor
-- opportunities (electrical, plumbing, HVAC, roofing, paving, fencing).

INSERT INTO public.rss_sources (name, url, keywords, city, ai_score, price_cents)
VALUES
  -- ── Hospitals + healthcare campuses (capital projects + RFPs) ──────────
  ('MGB · Mass General Brigham News',
   'https://www.massgeneralbrigham.org/news/rss',
   ARRAY['construction','renovation','expansion','wing','tower','rfp','capital','contract','project'],
   'Boston', 55, 2000),

  ('BIDMC · Beth Israel Deaconess News',
   'https://www.bidmc.org/about-bidmc/news/rss',
   ARRAY['construction','renovation','wing','tower','rfp','capital','expansion','contract'],
   'Boston', 50, 1800),

  ('Boston Children''s Hospital News',
   'https://www.childrenshospital.org/news/rss',
   ARRAY['construction','renovation','expansion','rfp','capital'],
   'Boston', 50, 1800),

  ('Dana-Farber News',
   'https://www.dana-farber.org/newsroom/news-releases/rss/',
   ARRAY['construction','renovation','expansion','rfp','capital'],
   'Boston', 50, 1800),

  ('UMass Memorial Health News',
   'https://www.ummhealth.org/news.rss',
   ARRAY['construction','renovation','expansion','rfp','capital'],
   'Worcester', 50, 1800),

  ('Baystate Health News',
   'https://www.baystatehealth.org/news/rss',
   ARRAY['construction','renovation','expansion','rfp','capital'],
   'Springfield', 50, 1800),

  -- ── Universities (capital plans + facilities) ──────────────────────────
  ('MIT News · Campus + Facilities',
   'https://news.mit.edu/topic/mitcampus-rss.xml',
   ARRAY['construction','renovation','expansion','dormitory','lab','rfp','capital','project'],
   'Cambridge', 55, 2000),

  ('Harvard Gazette · University News',
   'https://news.harvard.edu/gazette/feed/',
   ARRAY['construction','renovation','dormitory','lab','rfp','capital','project'],
   'Cambridge', 50, 1800),

  ('Tufts Now',
   'https://now.tufts.edu/rss.xml',
   ARRAY['construction','renovation','dormitory','rfp','capital','project'],
   'Medford', 45, 1500),

  ('BU Today',
   'https://www.bu.edu/today/feed/',
   ARRAY['construction','renovation','dormitory','rfp','capital','project'],
   'Boston', 45, 1500),

  ('Northeastern News',
   'https://news.northeastern.edu/feed/',
   ARRAY['construction','renovation','dormitory','rfp','capital','project'],
   'Boston', 45, 1500),

  ('UMass Amherst News',
   'https://www.umass.edu/news/rss.xml',
   ARRAY['construction','renovation','dormitory','rfp','capital','project'],
   'Amherst', 45, 1500),

  ('UMass Lowell News',
   'https://www.uml.edu/News/rss/',
   ARRAY['construction','renovation','dormitory','rfp','capital','project'],
   'Lowell', 40, 1300),

  ('UMass Dartmouth News',
   'https://www.umassd.edu/news.rss',
   ARRAY['construction','renovation','dormitory','rfp','capital','project'],
   'Dartmouth', 40, 1300),

  ('Worcester Polytechnic Institute News',
   'https://www.wpi.edu/news/rss.xml',
   ARRAY['construction','renovation','dormitory','rfp','capital','project'],
   'Worcester', 40, 1300),

  ('Wellesley College News',
   'https://www.wellesley.edu/news/rss',
   ARRAY['construction','renovation','dormitory','rfp','capital','project'],
   'Wellesley', 40, 1300),

  ('Amherst College News',
   'https://www.amherst.edu/news/rss.xml',
   ARRAY['construction','renovation','dormitory','rfp','capital','project'],
   'Amherst', 40, 1300),

  ('Williams College News',
   'https://www.williams.edu/news/rss/',
   ARRAY['construction','renovation','dormitory','rfp','capital','project'],
   'Williamstown', 40, 1300),

  ('Smith College News',
   'https://www.smith.edu/news/rss.xml',
   ARRAY['construction','renovation','dormitory','rfp','capital','project'],
   'Northampton', 40, 1300),

  ('Mount Holyoke News',
   'https://www.mtholyoke.edu/news/rss.xml',
   ARRAY['construction','renovation','dormitory','rfp','capital','project'],
   'South Hadley', 40, 1300),

  -- ── Independent + private schools (often have facilities news) ─────────
  ('Phillips Academy Andover News',
   'https://www.andover.edu/news.rss',
   ARRAY['construction','renovation','facility','capital','project'],
   'Andover', 40, 1300),

  ('Deerfield Academy News',
   'https://deerfield.edu/news.rss',
   ARRAY['construction','renovation','facility','capital','project'],
   'Deerfield', 35, 1100)
ON CONFLICT (url) DO NOTHING;
