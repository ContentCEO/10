import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Craigslist RSS harvester. Every CL section has an .rss endpoint — no auth,
// no scraping, no ToS issue. We target the high-signal sections where
// homeowners post requests for trade services.
//
// CL site shortcodes for MA + nearby: https://www.craigslist.org/about/sites
// We hit each site's "services wanted" (sso), "housing wanted" (hwa), and
// "real estate services" (rea) RSS feeds.

const CL_SITES = [
  // Massachusetts + immediate neighbors — full Northeast saturation
  "boston", "capecod", "western", "worcester", "southcoast",
  "newhampshire", "vermont", "rhodeisland", "providence",
  "hartford", "newhaven", "newlondon", "easternct", "nwct",

  // NY metro + state
  "newyork", "brooklyn", "manhattan", "queens", "bronx",
  "longisland", "westchester", "hudsonvalley", "catskills",
  "albany", "syracuse", "rochester", "buffalo", "binghamton",
  "ithaca", "utica", "fingerlakes", "plattsburgh",

  // Mid-Atlantic
  "philadelphia", "southjersey", "centraljersey", "northjersey", "jerseyshore",
  "pittsburgh", "allentown", "harrisburg", "lancaster", "scranton", "statecollege",
  "baltimore", "annapolis", "delaware", "easternshore",
  "washingtondc", "fredericksburg", "richmond", "hampton roads", "norfolk",
  "charlottesville", "lynchburg", "roanoke", "harrisonburg",

  // South Atlantic
  "raleigh", "charlotte", "greensboro", "asheville", "wilmington", "fayetteville",
  "charleston", "columbia", "greenville", "myrtlebeach", "hiltonhead",
  "atlanta", "savannah", "augusta", "athensga", "columbusga", "macon",
  "jacksonville", "orlando", "miami", "tampa", "fortmyers", "tallahassee",
  "sarasota", "spacecoast", "gainesville", "lakeland", "ocala",

  // Gulf + South Central
  "neworleans", "batonrouge", "lafayette", "shreveport",
  "jacksonms", "memphis", "nashville", "knoxville", "chattanooga",
  "birmingham", "huntsville", "mobile", "montgomery",
  "littlerock", "fayetteville-ar",

  // Midwest
  "chicago", "milwaukee", "madison", "greenbay", "appleton",
  "detroit", "grandrapids", "lansing", "annarbor", "kalamazoo",
  "cleveland", "columbus", "cincinnati", "dayton", "toledo",
  "indianapolis", "fortwayne", "evansville", "southbend",
  "stlouis", "kansascity", "springfieldmo", "columbiamo",
  "minneapolis", "duluth", "rochestermn", "stcloud",
  "desmoines", "iowacity", "cedarrapids",
  "omaha", "lincoln",

  // Texas
  "houston", "dallas", "austin", "sanantonio", "fortworth",
  "elpaso", "corpuschristi", "lubbock", "amarillo", "waco",
  "collegestation", "killeen", "laredo", "tyler",

  // Mountain
  "denver", "coloradosprings", "fortcollins", "boulder",
  "saltlakecity", "boise", "billings", "phoenix", "tucson", "flagstaff",
  "albuquerque", "santafe", "lasvegas", "reno",

  // Pacific
  "losangeles", "sandiego", "orangecounty", "inlandempire", "ventura",
  "bakersfield", "fresno", "modesto", "sacramento", "stockton", "visalia",
  "sfbay", "monterey", "santabarbara",
  "portland", "salem", "eugene", "bend",
  "seattle", "tacoma", "spokane", "olympia", "bellingham",
  "anchorage", "honolulu",

  // Oklahoma/Kansas
  "oklahomacity", "tulsa", "wichita", "topeka",
];

const CL_CATEGORIES = [
  "sso",  // services wanted (homeowners posting "need a pro")
  "lab",  // labor gigs (one-time jobs)
  "dmg",  // domestic gigs (cleaning, handyman)
  "ggg",  // all gigs fallback
];

interface ParsedEntry {
  id: string;
  title: string;
  text: string;
  url: string;
  date: string;
}

const KEYWORDS = [
  // Trade services
  "contractor", "remodel", "renovation", "renovate", "addition", "build",
  "kitchen", "bathroom", "basement", "attic", "garage",
  "deck", "porch", "patio", "pergola", "shed",
  "roof", "roofer", "shingles", "metal roof", "leak",
  "siding", "vinyl siding", "stucco", "exterior",
  "fence", "fencing", "gate", "railing",
  "concrete", "masonry", "brick", "stone", "foundation",
  "driveway", "asphalt", "paving", "sealcoat",
  "flooring", "hardwood", "tile", "carpet", "laminate", "vinyl plank",
  "drywall", "sheetrock", "plaster", "ceiling",
  "painter", "painting", "interior paint", "exterior paint", "trim",
  "plumber", "plumbing", "water heater", "leak", "clog", "drain", "toilet",
  "electrician", "electrical", "panel", "outlet", "wiring", "rewire",
  "hvac", "heating", "cooling", "ac install", "boiler", "furnace", "mini split",
  "landscaping", "landscaper", "lawn", "mowing", "mulch", "sod",
  "tree", "tree removal", "stump",
  "gutter", "gutter cleaning", "chimney", "chimney sweep",
  "pool", "spa", "hot tub",
  "window", "windows", "replacement window",
  "door", "garage door",
  "handyman", "handywoman", "fix it",
  "demolition", "demo", "junk removal", "haul",
  "snow removal", "plow",
  "pressure wash", "powerwash", "soft wash",
  "insulation", "spray foam",
  "solar", "solar panels",
  "septic", "sewer",
  "moving", "movers",
  "cleaning", "deep clean", "move out clean",
  "estimate", "quote", "bid", "looking for", "need help", "anyone know",
  "recommend", "recommendation", "trustworthy", "honest", "licensed",
];

function match1(s: string, re: RegExp): string | null {
  const m = s.match(re);
  return m ? m[1] : null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseCraigslistRSS(xml: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const itemRegex = /<item[\s\S]*?<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[0];
    const url = match1(block, /<link>([^<]+)<\/link>/) ?? "";
    const id = url.split("/").pop()?.replace(/\.html$/, "") ?? `${Math.random()}`;
    const title = decodeHtml(match1(block, /<title>([\s\S]*?)<\/title>/) ?? "");
    const desc = decodeHtml(match1(block, /<description>([\s\S]*?)<\/description>/) ?? "");
    const date = match1(block, /<dc:date>([^<]+)<\/dc:date>/) ?? match1(block, /<pubDate>([^<]+)<\/pubDate>/) ?? "";
    if (!title || !url) continue;
    entries.push({
      id: `cl:${id}`,
      title: stripHtml(title),
      text: stripHtml(desc),
      url,
      date,
    });
  }
  return entries;
}

function keywordMatch(e: ParsedEntry): string | null {
  const haystack = `${e.title}\n${e.text}`.toLowerCase();
  for (const k of KEYWORDS) {
    if (haystack.includes(k.toLowerCase())) return k;
  }
  return null;
}

async function pullFeed(site: string, category: string): Promise<{ entries: ParsedEntry[]; error: string | null }> {
  const url = `https://${site}.craigslist.org/search/${category}?format=rss`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ContractorFlow/1.0 (lead-aggregator)",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
      cache: "no-store",
    });
    if (!res.ok) return { entries: [], error: `HTTP ${res.status}` };
    const text = await res.text();
    if (text.length < 100) return { entries: [], error: "empty body" };
    return { entries: parseCraigslistRSS(text), error: null };
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function runOnce(opts: { sites?: string[]; categories?: string[] }) {
  const sites = opts.sites && opts.sites.length ? opts.sites : CL_SITES;
  const categories = opts.categories && opts.categories.length ? opts.categories : CL_CATEGORIES;

  const admin = createAdminClient();
  let fetched = 0, inserted = 0, duplicates = 0;
  const errors: Record<string, string> = {};

  for (const site of sites) {
    for (const cat of categories) {
      const { entries, error } = await pullFeed(site, cat);
      if (error) errors[`${site}/${cat}`] = error;
      fetched += entries.length;

      for (const e of entries) {
        const matched = keywordMatch(e);
        if (!matched) continue;
        const externalId = `${e.id}:${site}`;

        const { data: existing } = await admin
          .from("marketplace_leads").select("id")
          .eq("source_channel", "scraped").eq("external_id", externalId)
          .maybeSingle();
        if (existing) { duplicates++; continue; }

        const notes =
`Craigslist ${site} / ${cat} · matched: ${matched}

${e.text.slice(0, 800)}

Original: ${e.url}`;

        const { error: insertErr } = await admin.from("marketplace_leads").insert({
          name: `Craigslist · ${site}`,
          service_type: e.title.slice(0, 200),
          city: site,
          budget: "unsure",
          timeline: "flexible",
          notes,
          ai_score: 40, // Craigslist signals are moderate intent — homeowner posted publicly
          ai_summary: e.title.slice(0, 200),
          price_cents: 800,
          source_channel: "scraped",
          external_id: externalId,
          raw_payload: { id: e.id, title: e.title, url: e.url, date: e.date, site, category: cat } as unknown as Record<string, unknown>,
        });
        if (!insertErr) inserted++;
      }
    }
  }

  await admin.from("scraper_runs").insert({
    source: "craigslist",
    region: `${sites.length} sites × ${categories.length} cats`,
    fetched, inserted, duplicates,
    error: Object.keys(errors).length > 0
      ? `errors on: ${Object.entries(errors).slice(0, 5).map(([k, v]) => `${k}=${v}`).join(", ")}`
      : null,
  });

  return { fetched, inserted, duplicates, errors };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const sites = url.searchParams.get("sites")?.split(",").map((s) => s.trim()).filter(Boolean);
  const categories = url.searchParams.get("cats")?.split(",").map((s) => s.trim()).filter(Boolean);
  const result = await runOnce({ sites, categories });
  return NextResponse.json({ ok: true, source: "craigslist", ...result });
}

export async function POST(request: Request) { return GET(request); }
