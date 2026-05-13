import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Reddit RSS feed reader. JSON endpoint (/r/X/new.json) is rate-limited
// to ~zero from cloud datacenter IPs as of 2023; the .rss equivalent is
// explicitly intended for syndication and still works fine.
//
// Each feed entry → marketplace lead tagged `scraped`. Contractors choose
// whether to engage in-thread (Reddit ToS prohibits unsolicited DMs).

const DEFAULT_SUBS = [
  // National high-volume — home + DIY
  "HomeImprovement", "DIY", "Renovations", "RealEstate", "homeowners",
  "HomeMaintenance", "centuryhomes", "FirstTimeHomeBuyer", "HomeDecorating",
  "OldHouses", "FixIt", "whatisthisthing", "Home", "askacarpenter",
  // Trade-specific deep cuts (most active 2024-26)
  "Plumbing", "Roofing", "Electricians", "Construction", "Flooring",
  "Hvacadvice", "Landscaping", "Carpentry", "Painting", "Drywall",
  "Decks", "tile", "Concrete", "MyHomeImproved", "Appliances",
  "askanelectrician", "AskCarpentry", "AskElectricians", "AskPlumbing",
  "askanhvactech", "Insulation", "Welding", "Locksmith",
  "Masonry", "Stonemasonry", "Bricklaying", "Tiling",
  "GeneralContractor", "Handyman", "Cabinetry",
  "Solar", "SolarDIY", "ElectricalEngineering",
  "WoodWorking", "Carpentry", "houseplans", "architecture",
  "PestControl", "Mycology",
  "RealEstateInvesting", "FixAndFlip", "landlord", "LandlordTenant",
  // High-intent niche communities (idea C-17: deep cuts)
  "OldHouses", "victorian", "homestead", "Permaculture",
  "Bungalow", "Farmhouse", "TinyHouses", "tinyhouseplans",
  "ContractorUK", "Renovate", "RemodelMyHouse",
  "kitchenremodel", "BathroomRemodel", "basementremodel",
  "Foundation", "Basement", "Crawlspace",
  "WaterDamage", "MoldRemediation",
  "Beekeeping", "Chickens",      // outdoor structures / coops
  "vintagehomes", "midcenturyhome",
  // Massachusetts — full statewide coverage
  "boston", "massachusetts", "cambridgema", "somerville",
  "WorcesterMA", "metrowestma", "newengland",
  "Springfield", "lowell", "lawrence",
  // MA cities + towns (small subs, low volume each but high signal)
  "Brookline", "newton", "quincy", "MAPolitics",
  "Acton", "Andover", "Arlington_MA", "Brockton", "Burlington",
  "Chelmsford", "Chelsea", "Dorchester", "Everett", "FallRiver",
  "Framingham", "Gloucester", "Holyoke", "Hyannis", "Lynn",
  "Malden", "Medford", "Methuen", "MiltonMA", "NewBedford",
  "Northampton", "NorthShore", "PeabodyMA", "Pittsfield",
  "Plymouth_MA", "Randolph", "Revere", "Salem",
  "SaugusMA", "SouthShore", "Stoneham", "Taunton",
  "Waltham", "Watertown", "Wellesley", "Westford",
  "WestRoxbury", "Weymouth", "Winchester", "Winthrop",
  "Woburn", "Yarmouth", "Capecod", "BerkshireCo",
  "MAFreeForAll", "boston_apartments", "Massachusettshelp",
  // Neighbors (jobs spill across state lines)
  "ProvidenceRI", "RhodeIsland", "Connecticut", "NewHampshire",
  "VTContractors", "ManchesterNH", "NashuaNH", "RochesterNH",
  // Major US metros
  "nyc", "AskNYC", "chicago", "LosAngeles", "sandiego", "Seattle",
  "denver", "Atlanta", "Houston", "Dallas", "philadelphia", "Phoenix",
  "Portland", "PortlandOR", "Minneapolis", "PugetSound", "bayarea",
];

const DEFAULT_KEYWORDS = [
  // Intent words
  "contractor", "estimate", "quote", "looking for a", "recommend",
  "anyone know", "anyone have", "trustworthy", "reputable", "vetted",
  "hire", "hired", "need help with", "advice on", "any idea",
  "ballpark", "price range", "how much", "cost to", "diy or hire",
  "license", "licensed", "insured",
  // Remodel / construction
  "remodel", "renovation", "renovate", "rebuild", "replace", "update",
  "kitchen", "kitchen remodel", "kitchen renovation", "cabinets",
  "bathroom", "bath remodel", "shower remodel", "tub", "vanity",
  "basement", "basement finishing", "basement remodel",
  "garage", "garage conversion", "addition", "attic", "dormer", "in-law",
  "deck", "deck builder", "deck repair", "fence", "fence install",
  "porch", "patio", "pergola", "screen porch",
  // Exterior
  "roof", "roofer", "roof replacement", "roof leak", "shingles", "metal roof",
  "siding", "vinyl siding", "stucco", "exterior paint", "house paint",
  "windows", "window replacement", "energy efficient windows",
  "gutter", "gutter cleaning", "gutter guard", "chimney", "chimney sweep",
  // Floors / interior
  "flooring", "hardwood", "refinish floor", "tile", "carpet",
  "luxury vinyl", "lvp", "lvt", "laminate",
  "drywall", "sheetrock", "plaster", "popcorn ceiling",
  "painting", "paint", "interior paint", "trim work", "wallpaper",
  // Trades — electrical
  "electrician", "electrical", "wiring", "outlet", "panel", "rewire",
  "panel upgrade", "200 amp", "knob and tube", "ev charger", "level 2 charger",
  "gfci", "afci", "ceiling fan", "recessed light", "smoke detector",
  // Trades — plumbing
  "plumber", "plumbing", "leak", "water heater", "tankless",
  "drain", "drain cleaning", "clog", "toilet", "faucet",
  "sewer line", "sump pump", "garbage disposal", "sewer backup",
  // Trades — HVAC
  "hvac", "ac unit", "central air", "ductless", "mini split",
  "furnace", "boiler", "heat pump", "duct cleaning", "ductwork",
  // Outdoor / site
  "cleaning", "deep clean", "house clean", "move out clean",
  "landscaping", "landscaper", "lawn", "lawn care", "sod", "mulch",
  "tree", "tree removal", "tree service", "stump grinding",
  "driveway", "asphalt", "concrete", "paver", "walkway",
  "snow removal", "plowing",
  "pool", "pool install", "hot tub",
  // Damage / specialty
  "water damage", "flood damage", "mold", "mold remediation",
  "asbestos", "lead paint", "lead abatement",
  "general contractor", "handyman", "junk removal", "demolition",
  "insulation", "spray foam", "blown in",
  "solar", "solar panels", "battery backup",
];

interface ParsedEntry {
  id: string;
  title: string;
  contentHtml: string;
  contentText: string;
  url: string;
  author: string;
  updated: string;
}

// Naive but reliable Atom XML parser — pulls each <entry>'s id, title,
// content, link, author, updated. Reddit's RSS schema is stable.
function parseAtom(xml: string): ParsedEntry[] {
  const entries: ParsedEntry[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let m: RegExpExecArray | null;
  while ((m = entryRegex.exec(xml)) !== null) {
    const block = m[1];
    const id = match1(block, /<id>([^<]+)<\/id>/);
    const title = decodeHtml(match1(block, /<title[^>]*>([\s\S]*?)<\/title>/) ?? "");
    const link = match1(block, /<link[^>]*href="([^"]+)"/);
    const author = match1(block, /<author>[\s\S]*?<name>([^<]+)<\/name>[\s\S]*?<\/author>/);
    const updated = match1(block, /<updated>([^<]+)<\/updated>/);
    // Content is wrapped in <content type="html">CDATA or escaped HTML</content>.
    const contentRaw = match1(block, /<content[^>]*>([\s\S]*?)<\/content>/) ?? "";
    const cdata = match1(contentRaw, /<!\[CDATA\[([\s\S]*?)\]\]>/);
    const html = cdata ?? contentRaw;
    const text = stripHtml(decodeHtml(html));
    if (!id || !title || !link) continue;
    entries.push({
      id: id.replace(/^tag:reddit\.com,\d+:/, ""), // -> "t3_abc"
      title,
      contentHtml: html,
      contentText: text,
      url: link,
      author: author ?? "unknown",
      updated: updated ?? new Date().toISOString(),
    });
  }
  return entries;
}

function match1(s: string, re: RegExp): string | null {
  const m = s.match(re);
  return m ? m[1] : null;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function pullSub(subreddit: string): Promise<{ entries: ParsedEntry[]; error: string | null }> {
  const url = `https://www.reddit.com/r/${subreddit}/new/.rss?limit=100`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ContractorFlow/3.0 (RSS reader; partner outreach assist)",
        Accept: "application/atom+xml, application/xml, text/xml",
      },
      cache: "no-store",
    });
    if (!res.ok) return { entries: [], error: `HTTP ${res.status}` };
    const text = await res.text();
    if (text.length < 100) return { entries: [], error: "empty body" };
    return { entries: parseAtom(text), error: null };
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : "fetch failed" };
  }
}

function keywordMatch(e: ParsedEntry, keywords: string[]): string | null {
  const haystack = `${e.title}\n${e.contentText}`.toLowerCase();
  for (const k of keywords) {
    if (haystack.includes(k.toLowerCase())) return k;
  }
  return null;
}

function scoreFor(e: ParsedEntry): number {
  // RSS doesn't give us comment/score counts. Score by recency + content length.
  let score = 35;
  const len = e.contentText.length;
  if (len >= 200) score += 10;
  if (len >= 500) score += 10;
  const ageDays = (Date.now() - new Date(e.updated).getTime()) / 86_400_000;
  if (ageDays > 7) score -= 10;
  if (ageDays > 30) score -= 10;
  return Math.max(0, Math.min(100, score));
}

async function runOnce(opts: { subs?: string[]; keywords?: string[]; limit?: number }) {
  const subs = opts.subs && opts.subs.length ? opts.subs : DEFAULT_SUBS;
  const keywords = opts.keywords && opts.keywords.length ? opts.keywords : DEFAULT_KEYWORDS;
  const maxPerSub = opts.limit ?? 100;

  const admin = createAdminClient();
  let fetched = 0;
  let inserted = 0;
  let duplicates = 0;
  let errors: Record<string, string> = {};

  // Pass 1: pull all subs in parallel, collect matched entries.
  const matchedEntries: Array<{ sub: string; entry: ParsedEntry; keyword: string }> = [];
  for (const sub of subs) {
    const { entries, error } = await pullSub(sub);
    if (error) errors[sub] = error;
    const slice = entries.slice(0, maxPerSub);
    fetched += slice.length;
    for (const e of slice) {
      const kw = keywordMatch(e, keywords);
      if (kw) matchedEntries.push({ sub, entry: e, keyword: kw });
    }
  }

  // Cross-posting heuristic (idea C-18): if the same author shows up in
  // multiple subs within the same scrape, they're shopping harder — likely
  // higher intent. Boost the score and price.
  const authorPostCount = new Map<string, number>();
  for (const m of matchedEntries) {
    authorPostCount.set(m.entry.author, (authorPostCount.get(m.entry.author) ?? 0) + 1);
  }

  // Pass 2: dedup + insert, applying cross-post bonus.
  for (const { sub, entry: e, keyword } of matchedEntries) {
    const externalId = `reddit:${e.id}`;

    const { data: existing } = await admin
      .from("marketplace_leads").select("id")
      .eq("source_channel", "scraped").eq("external_id", externalId)
      .maybeSingle();
    if (existing) { duplicates++; continue; }

    const crossPostCount = authorPostCount.get(e.author) ?? 1;
    const crossPostBonus = crossPostCount >= 3 ? 20 : crossPostCount >= 2 ? 12 : 0;
    const aiScore = Math.min(100, scoreFor(e) + crossPostBonus);
    const priceCents = Math.max(300, Math.round(500 + aiScore * 10));

    const crossPostNote = crossPostBonus > 0
      ? `\n\nCROSS-POSTED: u/${e.author} appears in ${crossPostCount} subs this scrape (+${crossPostBonus} score).`
      : "";

    const notes =
`From r/${sub} · u/${e.author} · matched keyword: ${keyword}

${e.contentText.slice(0, 800)}

Thread: ${e.url}${crossPostNote}`;

    const { error: insertErr } = await admin.from("marketplace_leads").insert({
      name: `r/${sub} · u/${e.author}`,
      service_type: e.title.slice(0, 200),
      budget: "unsure",
      timeline: "flexible",
      notes,
      ai_score: aiScore,
      ai_summary: e.title.slice(0, 200),
      price_cents: priceCents,
      source_channel: "scraped",
      external_id: externalId,
      raw_payload: {
        id: e.id, title: e.title, url: e.url, author: e.author, updated: e.updated,
        cross_post_count: crossPostCount,
      } as unknown as Record<string, unknown>,
    });
    if (!insertErr) inserted++;
  }

  await admin.from("scraper_runs").insert({
    source: "reddit",
    region: `${subs.length} subs`,
    fetched, inserted, duplicates,
    error: Object.keys(errors).length > 0
      ? `errors on: ${Object.entries(errors).slice(0, 5).map(([s, e]) => `${s}=${e}`).join(", ")}`
      : null,
  });

  return { fetched, inserted, duplicates, sub_count: subs.length, errors };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const subs = url.searchParams.get("subs")?.split(",").map((s) => s.trim()).filter(Boolean);
  const keywords = url.searchParams.get("kw")?.split(",").map((s) => s.trim()).filter(Boolean);
  const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined;
  const result = await runOnce({ subs, keywords, limit });
  return NextResponse.json({ ok: true, source: "reddit", ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
