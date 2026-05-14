import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// MassDOT (Massachusetts Department of Transportation) project announcements.
// Source: MassDOT public RSS / news feed.
//
// Use case: state road / bridge / construction projects publish award notices
// and procurement plans. Subcontractors (paving, concrete, landscaping,
// signage, fencing, electrical, etc.) can bid for the private subcontract
// portions. Also signals geographic activity for nearby home services.

interface RssItem {
  guid?: string;
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
}

// The MassDOT RSS endpoint — published by mass.gov. Format varies; this
// is the announced press-release feed.
const MASSDOT_FEEDS = [
  { feed_url: "https://www.mass.gov/orgs/massachusetts-department-of-transportation/news.rss",   region: "Statewide" },
  { feed_url: "https://www.mass.gov/orgs/highway-division/news.rss",                              region: "MA highways" },
];

const KEYWORDS = [
  "construction", "reconstruction", "rehabilitation", "resurface", "repave",
  "bridge", "culvert", "intersection", "roadway", "sidewalk",
  "signal", "lighting", "guardrail", "fencing",
  "contract award", "rfp", "bid opening", "procurement",
  "drainage", "stormwater",
];

function parseRss(xml: string): RssItem[] {
  const items: RssItem[] = [];
  // Try both <item> (RSS 2.0) and <entry> (Atom) blocks.
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
  let inserted = 0, duplicates = 0;
  let totalFetched = 0;

  for (const { feed_url, region } of MASSDOT_FEEDS) {
    const items = await fetchFeed(feed_url);
    totalFetched += items.length;
    for (const it of items) {
      if (!it.guid && !it.link) continue;
      const externalId = `massdot:${(it.guid ?? it.link ?? "").slice(0, 120)}`;
      const { data: existing } = await admin
        .from("marketplace_leads").select("id")
        .eq("source_channel", "scraped").eq("external_id", externalId).maybeSingle();
      if (existing) { duplicates++; continue; }

      const { error } = await admin.from("marketplace_leads").insert({
        name: "MassDOT project",
        city: region,
        service_type: "Public works · subcontract opportunity",
        budget: "over_50k",
        timeline: "flexible",
        notes:
`Source: MassDOT (${region}) press release / RFP feed.
Title: ${it.title ?? ""}
Published: ${it.pubDate ?? ""}
Link: ${it.link ?? ""}

${(it.description ?? "").slice(0, 600)}

Use case: prime contractor subcontracting opportunity. Reach out to the
prime listed on the award notice. Most subs go to paving, concrete,
landscaping, signage, electrical, and fencing.`,
        ai_score: 55,
        ai_summary: (it.title ?? "MassDOT project").slice(0, 200),
        price_cents: 2000,
        source_channel: "scraped",
        external_id: externalId,
        raw_payload: it as unknown as Record<string, unknown>,
      });
      if (!error) inserted++;
    }
  }

  await admin.from("scraper_runs").insert({
    source: "massdot_projects", region: "MA statewide",
    fetched: totalFetched, inserted, duplicates,
  });
  return { fetched: totalFetched, inserted, duplicates };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runOnce();
  return NextResponse.json({ ok: true, source: "massdot_projects", ...result });
}

export async function POST(request: Request) { return GET(request); }
