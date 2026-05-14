import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// MA public construction RFPs — Massachusetts School Building Authority (MSBA),
// public school district capital projects, municipal town RFPs.
//
// These are LARGE contracts: $1M-$100M+ for school renovations, new school
// construction, gymnasium builds, HVAC retrofits, roof replacements at scale.
// Subcontractors (every trade) bid for portions. High-value, predictable,
// publicly announced.

interface RssItem {
  guid?: string;
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
}

const FEEDS = [
  { feed_url: "https://www.massschoolbuildings.org/news.rss",                        region: "MA · MSBA" },
  { feed_url: "https://www.massachusetts.gov/orgs/division-of-capital-asset-management-and-maintenance/news.rss", region: "MA · DCAMM" },
  { feed_url: "https://www.cmaa-newengland.org/feed",                                region: "New England · CMAA" },
];

const KEYWORDS = [
  "school", "construction", "renovation", "addition",
  "rfp", "bid opening", "procurement", "contract award",
  "feasibility study", "schematic design", "module renewal",
  "hvac", "roof", "windows", "boiler", "electrical",
  "gymnasium", "auditorium", "cafeteria", "classroom",
];

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<(item|entry)\b[\s\S]*?<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[0];
    const get = (tag: string) => {
      const r = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i");
      const x = block.match(r);
      if (!x) return undefined;
      return x[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, "$1")
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
        .trim();
    };
    const linkMatch = block.match(/<link\b[^>]*href="([^"]+)"/) ?? block.match(/<link\b[^>]*>([^<]+)<\/link>/i);
    items.push({
      guid: get("guid") ?? get("id") ?? linkMatch?.[1],
      title: get("title"),
      link: linkMatch?.[1] ?? get("link"),
      pubDate: get("pubDate") ?? get("updated") ?? get("published"),
      description: get("description") ?? get("summary") ?? get("content"),
    });
  }
  return items;
}

function matchesKeywords(item: RssItem): boolean {
  const hay = `${item.title ?? ""} ${item.description ?? ""}`.toLowerCase();
  return KEYWORDS.some((k) => hay.includes(k));
}

async function fetchFeed(feed_url: string): Promise<RssItem[]> {
  try {
    const res = await fetch(feed_url, { cache: "no-store" });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml).filter(matchesKeywords);
  } catch {
    return [];
  }
}

async function runOnce() {
  const admin = createAdminClient();
  let inserted = 0, duplicates = 0, totalFetched = 0;

  for (const { feed_url, region } of FEEDS) {
    const items = await fetchFeed(feed_url);
    totalFetched += items.length;
    for (const it of items) {
      if (!it.guid && !it.link) continue;
      const externalId = `ma_school:${(it.guid ?? it.link ?? "").slice(0, 120)}`;
      const { data: existing } = await admin
        .from("marketplace_leads").select("id")
        .eq("source_channel", "scraped").eq("external_id", externalId).maybeSingle();
      if (existing) { duplicates++; continue; }

      const { error } = await admin.from("marketplace_leads").insert({
        name: "MA public construction RFP",
        city: region,
        service_type: "Public construction · subcontract",
        budget: "over_50k",
        timeline: "one_to_three_months",
        notes:
`Source: ${region}
Title: ${it.title ?? ""}
Published: ${it.pubDate ?? ""}
Link: ${it.link ?? ""}

${(it.description ?? "").slice(0, 600)}

MA public school / state capital project. Prime contractor is named in
the award notice or RFP. Subs available: every trade (electrical,
plumbing, HVAC, roofing, paint, flooring, concrete, fencing).`,
        ai_score: 60,
        ai_summary: (it.title ?? "MA school construction RFP").slice(0, 200),
        price_cents: 2500,
        source_channel: "scraped",
        external_id: externalId,
        raw_payload: it as unknown as Record<string, unknown>,
      });
      if (!error) inserted++;
    }
  }

  await admin.from("scraper_runs").insert({
    source: "ma_school_construction", region: "MA statewide",
    fetched: totalFetched, inserted, duplicates,
  });
  return { fetched: totalFetched, inserted, duplicates };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runOnce();
  return NextResponse.json({ ok: true, source: "ma_school_construction", ...result });
}

export async function POST(request: Request) { return GET(request); }
