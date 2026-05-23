import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Mass.gov procurement / bid RSS feed. State and municipal contracts open
// to construction-related work. Each bid → marketplace lead tagged as a
// high-intent commercial opportunity for contractors.
//
// Endpoint: https://www.commbuys.com (Mass procurement) has RSS feeds per
// solicitation category. We hit the construction / facilities feeds.

interface Bid {
  id: string;
  title: string;
  description: string;
  url: string;
  date: string;
  agency: string;
}

const FEEDS = [
  // commbuys.com bid feeds — actual URLs vary. We hit their RSS index.
  { name: "commbuys-construction", url: "https://www.commbuys.com/bso/external/publicBids.sdo?reset=true&category=Construction" },
  { name: "commbuys-facilities",   url: "https://www.commbuys.com/bso/external/publicBids.sdo?reset=true&category=Facilities" },
];

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

function parseBids(html: string): Bid[] {
  // commbuys uses table-row HTML rather than RSS. Pull rows with bid IDs.
  const out: Bid[] = [];
  const rowRegex = /<tr[^>]*class="[^"]*bidRow[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
  let m: RegExpExecArray | null;
  while ((m = rowRegex.exec(html)) !== null) {
    const block = m[1];
    const id = match1(block, /bid_id[^>]*>([^<]+)</) ?? Math.random().toString();
    const title = decodeHtml(match1(block, /bid_title[^>]*>([\s\S]*?)</) ?? "");
    const agency = decodeHtml(match1(block, /bid_agency[^>]*>([^<]+)</) ?? "MA");
    const url = match1(block, /href="([^"]+)"/) ?? "";
    if (title) out.push({ id, title: stripHtml(title), description: "", url, date: "", agency });
  }
  return out;
}

async function pullFeed(url: string): Promise<{ entries: Bid[]; error: string | null }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ContractorFlow/1.0 (bid-aggregator)" },
      cache: "no-store",
    });
    if (!res.ok) return { entries: [], error: `HTTP ${res.status}` };
    const text = await res.text();
    return { entries: parseBids(text), error: null };
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function runOnce() {
  const admin = createAdminClient();
  let fetched = 0, inserted = 0, duplicates = 0;
  const errors: Record<string, string> = {};

  for (const feed of FEEDS) {
    const { entries, error } = await pullFeed(feed.url);
    if (error) errors[feed.name] = error;
    fetched += entries.length;

    for (const b of entries) {
      const externalId = `bid:${feed.name}:${b.id}`;
      const { data: existing } = await admin
        .from("marketplace_leads").select("id")
        .eq("source_channel", "scraped").eq("external_id", externalId)
        .maybeSingle();
      if (existing) { duplicates++; continue; }

      const { error: insertErr } = await admin.from("marketplace_leads").insert({
        name: b.agency || "MA State agency",
        service_type: b.title.slice(0, 200),
        city: "MA",
        budget: "over_50k", // public bids are large
        timeline: "one_to_three_months",
        notes: `Public bid: ${b.title}\nAgency: ${b.agency}\nMore info: ${b.url}`,
        ai_score: 75, // high-intent commercial opportunity
        ai_summary: b.title.slice(0, 200),
        price_cents: 3000,
        source_channel: "scraped",
        external_id: externalId,
        raw_payload: b as unknown as Record<string, unknown>,
      });
      if (!insertErr) inserted++;
    }
  }

  await admin.from("scraper_runs").insert({
    source: "mass_gov_bids", region: "MA",
    fetched, inserted, duplicates,
    error: Object.keys(errors).length > 0
      ? `errors on: ${Object.entries(errors).slice(0, 5).map(([k, v]) => `${k}=${v}`).join(", ")}`
      : null,
  });

  return { ok: true, fetched, inserted, duplicates, errors };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runOnce());
}
export async function POST(request: Request) { return GET(request); }
