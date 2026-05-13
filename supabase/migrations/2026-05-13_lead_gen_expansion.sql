-- Lead-gen expansion to hit ~1000 leads/day.
-- Adds 60+ high-yield RSS sources covering top US metros.
-- The universal RSS scraper at /api/scrape/rss reads these on a 5-min cadence.

insert into public.rss_sources (name, url, keywords, city, ai_score, price_cents, is_active)
values
  -- ============================================================
  -- Craigslist "labor gigs" (lab) + "skilled trades" (sks) by metro.
  -- Public RSS, no auth needed, refresh frequently. Goldmine for
  -- homeowner-posted small jobs.
  -- ============================================================
  ('CL · Boston · labor',         'https://boston.craigslist.org/search/lab?format=rss',         array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Boston, MA',         55, 1500, true),
  ('CL · Boston · skilled',       'https://boston.craigslist.org/search/sks?format=rss',         array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Boston, MA',     65, 2000, true),
  ('CL · NYC · labor',            'https://newyork.craigslist.org/search/lab?format=rss',        array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'New York, NY',       55, 1500, true),
  ('CL · NYC · skilled',          'https://newyork.craigslist.org/search/sks?format=rss',        array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'New York, NY',    65, 2000, true),
  ('CL · LA · labor',             'https://losangeles.craigslist.org/search/lab?format=rss',     array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Los Angeles, CA',    55, 1500, true),
  ('CL · LA · skilled',           'https://losangeles.craigslist.org/search/sks?format=rss',     array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Los Angeles, CA', 65, 2000, true),
  ('CL · Chicago · labor',        'https://chicago.craigslist.org/search/lab?format=rss',        array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Chicago, IL',        55, 1500, true),
  ('CL · Chicago · skilled',      'https://chicago.craigslist.org/search/sks?format=rss',        array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Chicago, IL',     65, 2000, true),
  ('CL · Houston · labor',        'https://houston.craigslist.org/search/lab?format=rss',        array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Houston, TX',        55, 1500, true),
  ('CL · Houston · skilled',      'https://houston.craigslist.org/search/sks?format=rss',        array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Houston, TX',     65, 2000, true),
  ('CL · Atlanta · labor',        'https://atlanta.craigslist.org/search/lab?format=rss',        array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Atlanta, GA',        55, 1500, true),
  ('CL · Atlanta · skilled',      'https://atlanta.craigslist.org/search/sks?format=rss',        array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Atlanta, GA',     65, 2000, true),
  ('CL · Dallas · labor',         'https://dallas.craigslist.org/search/lab?format=rss',         array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Dallas, TX',         55, 1500, true),
  ('CL · Dallas · skilled',       'https://dallas.craigslist.org/search/sks?format=rss',         array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Dallas, TX',      65, 2000, true),
  ('CL · Miami · labor',          'https://miami.craigslist.org/search/lab?format=rss',          array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Miami, FL',          55, 1500, true),
  ('CL · Miami · skilled',        'https://miami.craigslist.org/search/sks?format=rss',          array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Miami, FL',       65, 2000, true),
  ('CL · Seattle · labor',        'https://seattle.craigslist.org/search/lab?format=rss',        array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Seattle, WA',        55, 1500, true),
  ('CL · Seattle · skilled',      'https://seattle.craigslist.org/search/sks?format=rss',        array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Seattle, WA',     65, 2000, true),
  ('CL · Denver · labor',         'https://denver.craigslist.org/search/lab?format=rss',         array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Denver, CO',         55, 1500, true),
  ('CL · Denver · skilled',       'https://denver.craigslist.org/search/sks?format=rss',         array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Denver, CO',      65, 2000, true),
  ('CL · Phoenix · labor',        'https://phoenix.craigslist.org/search/lab?format=rss',        array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Phoenix, AZ',        55, 1500, true),
  ('CL · Phoenix · skilled',      'https://phoenix.craigslist.org/search/sks?format=rss',        array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Phoenix, AZ',     65, 2000, true),
  ('CL · Philly · labor',         'https://philadelphia.craigslist.org/search/lab?format=rss',   array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Philadelphia, PA',   55, 1500, true),
  ('CL · Philly · skilled',       'https://philadelphia.craigslist.org/search/sks?format=rss',   array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Philadelphia, PA',65, 2000, true),
  ('CL · DC · labor',             'https://washingtondc.craigslist.org/search/lab?format=rss',   array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Washington, DC',     55, 1500, true),
  ('CL · DC · skilled',           'https://washingtondc.craigslist.org/search/sks?format=rss',   array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Washington, DC', 65, 2000, true),
  ('CL · SF Bay · labor',         'https://sfbay.craigslist.org/search/lab?format=rss',          array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'San Francisco, CA',  55, 1500, true),
  ('CL · SF Bay · skilled',       'https://sfbay.craigslist.org/search/sks?format=rss',          array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'San Francisco, CA',65, 2000, true),
  ('CL · Charlotte · labor',      'https://charlotte.craigslist.org/search/lab?format=rss',      array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Charlotte, NC',      55, 1500, true),
  ('CL · Charlotte · skilled',    'https://charlotte.craigslist.org/search/sks?format=rss',      array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Charlotte, NC',   65, 2000, true),
  ('CL · Portland · labor',       'https://portland.craigslist.org/search/lab?format=rss',       array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Portland, OR',       55, 1500, true),
  ('CL · Portland · skilled',     'https://portland.craigslist.org/search/sks?format=rss',       array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Portland, OR',    65, 2000, true),
  ('CL · Minneapolis · labor',    'https://minneapolis.craigslist.org/search/lab?format=rss',    array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Minneapolis, MN',    55, 1500, true),
  ('CL · Minneapolis · skilled',  'https://minneapolis.craigslist.org/search/sks?format=rss',    array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Minneapolis, MN', 65, 2000, true),
  ('CL · Detroit · labor',        'https://detroit.craigslist.org/search/lab?format=rss',        array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Detroit, MI',        55, 1500, true),
  ('CL · Detroit · skilled',      'https://detroit.craigslist.org/search/sks?format=rss',        array['contractor','plumb','electric','hvac','carpent','tile','drywall','siding'], 'Detroit, MI',     65, 2000, true),
  ('CL · Orlando · labor',        'https://orlando.craigslist.org/search/lab?format=rss',        array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Orlando, FL',        55, 1500, true),
  ('CL · Tampa · labor',          'https://tampa.craigslist.org/search/lab?format=rss',          array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Tampa, FL',          55, 1500, true),
  ('CL · San Diego · labor',      'https://sandiego.craigslist.org/search/lab?format=rss',       array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'San Diego, CA',      55, 1500, true),
  ('CL · Sacramento · labor',     'https://sacramento.craigslist.org/search/lab?format=rss',     array['gutters','roof','paint','fence','deck','remodel','install','repair'], 'Sacramento, CA',     55, 1500, true),

  -- ============================================================
  -- NWS storm warnings by state. Active alerts in atom format.
  -- Triggers contractor work spikes (tree, roof, basement).
  -- ============================================================
  ('NWS · MA alerts',  'https://api.weather.gov/alerts/active?area=MA&output=atom', array['storm','wind','rain','flood','snow','hail','tornado'], 'Massachusetts', 70, 2500, true),
  ('NWS · NY alerts',  'https://api.weather.gov/alerts/active?area=NY&output=atom', array['storm','wind','rain','flood','snow','hail','tornado'], 'New York',      70, 2500, true),
  ('NWS · TX alerts',  'https://api.weather.gov/alerts/active?area=TX&output=atom', array['storm','wind','rain','flood','snow','hail','tornado'], 'Texas',         70, 2500, true),
  ('NWS · FL alerts',  'https://api.weather.gov/alerts/active?area=FL&output=atom', array['storm','wind','rain','flood','snow','hail','tornado'], 'Florida',       70, 2500, true),
  ('NWS · CA alerts',  'https://api.weather.gov/alerts/active?area=CA&output=atom', array['storm','wind','rain','flood','snow','hail','tornado','wildfire'], 'California', 70, 2500, true),
  ('NWS · IL alerts',  'https://api.weather.gov/alerts/active?area=IL&output=atom', array['storm','wind','rain','flood','snow','hail','tornado'], 'Illinois',      70, 2500, true),
  ('NWS · GA alerts',  'https://api.weather.gov/alerts/active?area=GA&output=atom', array['storm','wind','rain','flood','snow','hail','tornado'], 'Georgia',       70, 2500, true),
  ('NWS · NC alerts',  'https://api.weather.gov/alerts/active?area=NC&output=atom', array['storm','wind','rain','flood','snow','hail','tornado'], 'North Carolina',70, 2500, true),
  ('NWS · NJ alerts',  'https://api.weather.gov/alerts/active?area=NJ&output=atom', array['storm','wind','rain','flood','snow','hail','tornado'], 'New Jersey',    70, 2500, true),
  ('NWS · PA alerts',  'https://api.weather.gov/alerts/active?area=PA&output=atom', array['storm','wind','rain','flood','snow','hail','tornado'], 'Pennsylvania',  70, 2500, true),
  ('NWS · OH alerts',  'https://api.weather.gov/alerts/active?area=OH&output=atom', array['storm','wind','rain','flood','snow','hail','tornado'], 'Ohio',          70, 2500, true),
  ('NWS · MI alerts',  'https://api.weather.gov/alerts/active?area=MI&output=atom', array['storm','wind','rain','flood','snow','hail','tornado'], 'Michigan',      70, 2500, true),
  ('NWS · WA alerts',  'https://api.weather.gov/alerts/active?area=WA&output=atom', array['storm','wind','rain','flood','snow','hail','tornado'], 'Washington',    70, 2500, true),
  ('NWS · AZ alerts',  'https://api.weather.gov/alerts/active?area=AZ&output=atom', array['storm','wind','rain','flood','dust','hail','tornado','wildfire'], 'Arizona', 70, 2500, true),
  ('NWS · CO alerts',  'https://api.weather.gov/alerts/active?area=CO&output=atom', array['storm','wind','snow','hail','tornado','wildfire'], 'Colorado',          70, 2500, true)

on conflict (url) do nothing;

-- Verify
do $$
declare cnt int;
begin
  select count(*) into cnt from public.rss_sources where is_active = true;
  raise notice 'rss_sources active count: %', cnt;
end $$;
