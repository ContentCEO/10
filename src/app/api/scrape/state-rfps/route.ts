import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// State Request-for-Proposals aggregator. Hits each state's procurement
// RSS / JSON feed where one exists. Schema differs per state — we use a
// best-effort parser per state and skip ones that 404.
//
// Most state RFPs are 6-7 figure construction/services contracts. Price
// tier is high — same as SAM.gov.

const STATE_FEEDS: { state: string; name: string; url: string; format: "rss" | "json" }[] = [
  // Massachusetts — COMMBUYS already has its own scraper
  { state: "NY", name: "NY State Contract Reporter", url: "https://www.empire.state.ny.us/PublicProcurementRSS", format: "rss" },
  { state: "NJ", name: "NJ State eProcurement", url: "https://www.njstart.gov/api/public/opps.rss", format: "rss" },
  { state: "CT", name: "CT State BizNet",  url: "https://biznet.ct.gov/SCP_Search/feeds/all.xml", format: "rss" },
  { state: "PA", name: "PA eMarketplace", url: "http://www.emarketplace.state.pa.us/PublicRSS.aspx", format: "rss" },
  { state: "VA", name: "Virginia eVA",     url: "https://eva.virginia.gov/api/v1/solicitations.rss", format: "rss" },
  { state: "FL", name: "Florida MyFloridaMarketPlace", url: "https://vbs.dms.state.fl.us/vbs/main_menu.rss", format: "rss" },
  { state: "GA", name: "Georgia Procurement", url: "http://ssl.doas.state.ga.us/PRSapp/PR_announce_rss.jsp", format: "rss" },
  { state: "TX", name: "TX SmartBuy",       url: "https://www.txsmartbuy.com/sp/feed", format: "rss" },
  { state: "IL", name: "Illinois Procurement Bulletin", url: "https://www.illinois.gov/bid/feed.rss", format: "rss" },
  { state: "OH", name: "Ohio Bid Tracker",  url: "https://procure.ohio.gov/rss/opps.rss", format: "rss" },
  { state: "MI", name: "Michigan SIGMA",    url: "https://www.michigan.gov/sigmavss/rss", format: "rss" },
  { state: "WA", name: "Washington WEBS",   url: "https://fortress.wa.gov/ga/webs/feeds/opportunities.rss", format: "rss" },
  { state: "OR", name: "Oregon ORPIN",      url: "https://orpin.oregon.gov/open.dll/feed.rss", format: "rss" },
  { state: "CA", name: "Cal eProcure",      url: "https://caleprocure.ca.gov/PSEPP/AC72_OPP.feed.rss", format: "rss" },
  { state: "AZ", name: "ProcureAZ",         url: "https://procure.az.gov/feed/rss", format: "rss" },
  { state: "CO", name: "Colorado BIDS",     url: "https://copls.opengov.com/rss/portal_solicitations.rss", format: "rss" },
  { state: "NV", name: "Nevada NV",         url: "https://nevadaepro.com/rss/opps.rss", format: "rss" },
];

const CONSTRUCTION_KEYWORDS = [
  "construction", "build", "renovation", "remodel", "rehab", "rebuild",
  "roof", "hvac", "plumbing", "electrical", "painting", "concrete",
  "masonry", "flooring", "drywall", "demolition", "siding", "windows",
  "doors", "landscape", "paving", "sewer", "water main",
];

interface RssItem {
  id: string;
  title: string;
  description: string;
  url: string;
  date: string;
}

function match1(s: string, re: RegExp): string | null {
  const m = s.match(re);
  return m ? m[1] : null;
}
function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function parseRss(xml: string): RssItem[] {
  const out: RssItem[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const url = match1(block, /<link>([^<]+)<\/link>/) ?? "";
    const id = url || match1(block, /<guid[^>]*>([^<]+)<\/guid>/) ?? `${Math.random()}`;
    const title = decodeHtml(stripHtml(match1(block, /<title>([\s\S]*?)<\/title>/) ?? ""));
    const desc = decodeHtml(stripHtml(match1(block, /<description>([\s\S]*?)<\/description>/) ?? ""));
    const date = match1(block, /<pubDate>([^<]+)<\/pubDate>/) ?? "";
    if (!title) continue;
    out.push({ id, title, description: desc, url, date });
  }
  return out;
}

function isConstructionRelevant(text: string): boolean {
  const t = text.toLowerCase();
  return CONSTRUCTION_KEYWORDS.some((k) => t.includes(k));
}

async function pullState(feed: typeof STATE_FEEDS[number]): Promise<{ items: RssItem[]; error: string | null }> {
  try {
    const res = await fetch(feed.url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
        "User-Agent": "ContractorFlow/1.0 (lead-aggregator)",
      },
      cache: "no-store",
    });
    if (!res.ok) return { items: [], error: `HTTP ${res.status}` };
    const text = await res.text();
    return { items: parseRss(text), error: null };
  } catch (e) {
    return { items: [], error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function runOnce(opts: { states?: string[] }) {
  const feeds = opts.states && opts.states.length
    ? STATE_FEEDS.filter((f) => opts.states!.includes(f.state))
    : STATE_FEEDS;
  const admin = createAdminClient();

  let totalFetched = 0;
  let inserted = 0;
  let duplicates = 0;
  let irrelevant = 0;
  const errors: Record<string, string> = {};

  for (const feed of feeds) {
    const { items, error } = await pullState(feed);
    if (error) errors[feed.state] = error;
    totalFetched += items.length;

    for (const item of items) {
      const text = `${item.title}\n${item.description}`;
      if (!isConstructionRelevant(text)) { irrelevant++; continue; }

      const externalId = `staterfp:${feed.state}:${item.id.slice(0, 80)}`;
      const { data: existing } = await admin
        .from("marketplace_leads").select("id")
        .eq("source_channel", "scraped").eq("external_id", externalId)
        .maybeSingle();
      if (existing) { duplicates++; continue; }

      const { error: insErr } = await admin.from("marketplace_leads").insert({
        name: `${feed.state} state agency`,
        service_type: item.title.slice(0, 200),
        city: feed.state,
        budget: "over_50k",
        timeline: "one_to_three_months",
        notes:
`State RFP — ${feed.name}
${item.description.slice(0, 800)}

Posted: ${item.date}
Source: ${item.url}`,
        ai_score: 70,
        ai_summary: item.title.slice(0, 200),
        price_cents: 3500,
        source_channel: "scraped",
        external_id: externalId,
        raw_payload: { ...item, feed: feed.name, state: feed.state } as unknown as Record<string, unknown>,
      });
      if (!insErr) inserted++;
    }
  }

  await admin.from("scraper_runs").insert({
    source: "state_rfps", region: `${feeds.length} states`,
    fetched: totalFetched, inserted, duplicates,
    error: Object.keys(errors).length > 0
      ? `errors on: ${Object.keys(errors).join(",")}`
      : null,
  });

  return { fetched: totalFetched, inserted, duplicates, irrelevant };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const states = url.searchParams.get("states")?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
  const result = await runOnce({ states });
  return NextResponse.json({ ok: true, source: "state_rfps", ...result });
}

export async function POST(request: Request) { return GET(request); }
