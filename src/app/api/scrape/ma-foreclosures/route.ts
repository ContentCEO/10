import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// MA foreclosure auction notices and REO listings (real-estate-owned).
//
// Foreclosed and just-purchased-at-auction properties are high-intent
// renovation leads:
//   - bank or auction buyer typically needs repairs to flip or rent
//   - timeline is immediate (often within 30-90 days of purchase)
//   - budgets are sized to expected resale uplift
//
// Source: state secretary auctions calendar (RSS) + HUD homestore feed.

interface RssItem {
  guid?: string;
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
}

const FEEDS = [
  { feed_url: "https://www.hudhomestore.gov/Listing/PropertyRSS.aspx?state=MA",        region: "MA · HUD homestore" },
  { feed_url: "https://www.foreclosure.com/rss/listings?state=MA",                      region: "MA · foreclosure.com" },
];

const KEYWORDS = [
  "foreclosure", "auction", "reo", "bank-owned", "as-is", "estate sale",
  "renovate", "rehab", "investor", "fixer", "needs work",
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

function isLikelyFix(item: RssItem): boolean {
  const hay = `${item.title ?? ""} ${item.description ?? ""}`.toLowerCase();
  return KEYWORDS.some((k) => hay.includes(k));
}

async function fetchFeed(feed_url: string): Promise<RssItem[]> {
  try {
    const res = await fetch(feed_url, { cache: "no-store" });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml).filter(isLikelyFix);
  } catch {
    return [];
  }
}

async function runOnce() {
  const admin = createAdminClient();
  let inserted = 0, duplicates = 0;
  let totalFetched = 0;

  for (const { feed_url, region } of FEEDS) {
    const items = await fetchFeed(feed_url);
    totalFetched += items.length;
    for (const it of items) {
      if (!it.guid && !it.link) continue;
      const externalId = `ma_foreclosure:${(it.guid ?? it.link ?? "").slice(0, 120)}`;
      const { data: existing } = await admin
        .from("marketplace_leads").select("id")
        .eq("source_channel", "scraped").eq("external_id", externalId).maybeSingle();
      if (existing) { duplicates++; continue; }

      const { error } = await admin.from("marketplace_leads").insert({
        name: "MA distressed property",
        city: region,
        service_type: "Rehab / flip · multi-trade",
        budget: "over_50k",
        timeline: "one_to_three_months",
        notes:
`Source: ${region}
Title: ${it.title ?? ""}
Listed: ${it.pubDate ?? ""}
Link: ${it.link ?? ""}

${(it.description ?? "").slice(0, 600)}

Use case: foreclosed / REO / distressed property typically needs full
rehab: roof, kitchen, bath, HVAC, electrical, paint. Buyer-investor
will hire crews fast and at scale.`,
        ai_score: 65,
        ai_summary: (it.title ?? "Distressed MA property").slice(0, 200),
        price_cents: 3000,
        source_channel: "scraped",
        external_id: externalId,
        raw_payload: it as unknown as Record<string, unknown>,
      });
      if (!error) inserted++;
    }
  }

  await admin.from("scraper_runs").insert({
    source: "ma_foreclosures", region: "MA statewide",
    fetched: totalFetched, inserted, duplicates,
  });
  return { fetched: totalFetched, inserted, duplicates };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runOnce();
  return NextResponse.json({ ok: true, source: "ma_foreclosures", ...result });
}

export async function POST(request: Request) { return GET(request); }
