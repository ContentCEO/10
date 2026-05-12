-- Seed the universal RSS aggregator with high-yield default feeds. Each one
-- gets pulled by /api/scrape/rss every 15 min and filtered against the
-- keywords array before being inserted as a marketplace lead (which then
-- goes to curation, per the lead_curation migration).
--
-- Safe to re-run — uses ON CONFLICT (url) DO NOTHING since rss_sources.url
-- has a UNIQUE constraint.

INSERT INTO public.rss_sources (name, url, keywords, city, ai_score, price_cents)
VALUES
  -- Federal procurement + news
  ('GSA News',
   'https://www.gsa.gov/rss-feed',
   ARRAY['construction','rfp','contract','project','building','renovation','facility'],
   NULL, 55, 2000),

  ('HUD news',
   'https://www.hud.gov/sites/dfiles/PressroomCom/documents/press_releases.rss',
   ARRAY['housing','development','construction','rehabilitation','grant'],
   NULL, 50, 1500),

  ('FEMA news',
   'https://www.fema.gov/feeds/news.atom',
   ARRAY['disaster','damage','rebuild','recovery','flood','hurricane'],
   NULL, 55, 1500),

  ('Construction Dive',
   'https://www.constructiondive.com/feeds/news/',
   ARRAY['rfp','project','announce','contract','bid'],
   NULL, 35, 600),

  ('Engineering News-Record',
   'https://www.enr.com/rss/articles',
   ARRAY['contract','project','rfp','build','renovation'],
   NULL, 35, 600),

  ('For Construction Pros',
   'https://www.forconstructionpros.com/rss',
   ARRAY['rfp','project','contract','jobsite'],
   NULL, 30, 500),

  -- City news / press feeds (announcements often include capital projects)
  ('Boston.gov news',
   'https://www.boston.gov/news/rss.xml',
   ARRAY['construction','street','park','renovation','project','rfp'],
   'Boston', 45, 1000),

  ('NYC press releases',
   'https://www1.nyc.gov/site/home/news/news.page?format=rss',
   ARRAY['construction','infrastructure','rfp','contract','renovation'],
   'New York', 45, 1000),

  ('Chicago news',
   'https://www.chicago.gov/city/en/depts/mayor/press_room/press_releases.rss',
   ARRAY['construction','infrastructure','rfp','contract'],
   'Chicago', 45, 1000),

  ('Los Angeles news',
   'https://www.lacity.org/about-los-angeles/news?format=rss',
   ARRAY['construction','infrastructure','rfp','contract'],
   'Los Angeles', 45, 1000),

  -- State procurement & legislative (some construction in there)
  ('MA Executive Office news',
   'https://www.mass.gov/news.rss',
   ARRAY['construction','rfp','contract','procurement','rehabilitation','renovation'],
   NULL, 40, 800),

  ('NY State news',
   'https://www.governor.ny.gov/news.rss',
   ARRAY['construction','infrastructure','rfp','contract'],
   NULL, 40, 800),

  -- Real estate / disaster signals
  ('NWS Atom alerts (US)',
   'https://api.weather.gov/alerts/active.atom',
   ARRAY['flood','tornado','hurricane','severe','damage','wind'],
   NULL, 55, 600),

  -- University & school district capital projects
  ('Smart Procure / GovSpend (RSS)',
   'https://smartprocure.com/feed/',
   ARRAY['rfp','school','university','district','construction'],
   NULL, 50, 1500),

  -- DoD & VA construction
  ('Defense.gov contracts',
   'https://www.defense.gov/News/Contracts/contracts.rss',
   ARRAY['construction','engineering','renovation','build','facility','base'],
   NULL, 60, 2500),

  ('VA news',
   'https://news.va.gov/feed/',
   ARRAY['construction','facility','renovation','medical center'],
   NULL, 50, 1500),

  -- DOT / infrastructure
  ('USDOT news',
   'https://www.transportation.gov/rss/news.xml',
   ARRAY['construction','road','bridge','infrastructure','contract','rfp'],
   NULL, 45, 1000),

  -- EPA (environmental remediation contracts)
  ('EPA newsroom',
   'https://www.epa.gov/newsreleases/search/rss',
   ARRAY['remediation','superfund','contractor','construction','cleanup'],
   NULL, 50, 1500),

  -- Department of Energy
  ('DOE news',
   'https://www.energy.gov/rss.xml',
   ARRAY['construction','build','facility','project','contract'],
   NULL, 45, 1000),

  -- Industry / trade RSS for ambient signals
  ('Builder Magazine',
   'https://www.builderonline.com/rss',
   ARRAY['rfp','project','contract'],
   NULL, 25, 400),

  ('Remodeling Magazine',
   'https://www.remodeling.hw.net/rss',
   ARRAY['rfp','project','remodel','renovation'],
   NULL, 25, 400),

  -- City-specific permit announcement boards
  ('Worcester news',
   'https://www.worcesterma.gov/news.rss',
   ARRAY['construction','project','rfp','renovation','contract'],
   'Worcester', 45, 800),

  ('Cambridge news',
   'https://www.cambridgema.gov/news/rss',
   ARRAY['construction','project','rfp','renovation'],
   'Cambridge', 45, 800),

  ('Springfield MA news',
   'https://www.springfield-ma.gov/news.rss',
   ARRAY['construction','project','rfp','renovation'],
   'Springfield', 45, 800),

  ('Providence RI news',
   'https://www.providenceri.gov/news.rss',
   ARRAY['construction','project','rfp','contract'],
   'Providence', 45, 800),

  -- Reddit topic feeds (already pulled by /api/scrape/reddit but adding
  -- as RSS sources lets the universal aggregator pick up additional subs
  -- the user wants without code changes)
  ('Reddit r/HomeImprovement',
   'https://www.reddit.com/r/HomeImprovement/.rss',
   ARRAY['hire','recommend','looking for','help with','should I'],
   NULL, 35, 600),

  ('Reddit r/HomeRenovations',
   'https://www.reddit.com/r/HomeRenovations/.rss',
   ARRAY['hire','recommend','looking for','help'],
   NULL, 35, 600),

  ('Reddit r/DIY',
   'https://www.reddit.com/r/DIY/.rss',
   ARRAY['gave up','too much','need pro','overwhelmed','hire'],
   NULL, 30, 500),

  ('Reddit r/AskBoston',
   'https://www.reddit.com/r/AskBoston/.rss',
   ARRAY['contractor','recommend','plumber','electrician','handyman','painter'],
   'Boston', 50, 1200),

  ('Reddit r/AskNYC',
   'https://www.reddit.com/r/AskNYC/.rss',
   ARRAY['contractor','recommend','plumber','electrician','handyman'],
   'New York', 50, 1200)
ON CONFLICT (url) DO NOTHING;
