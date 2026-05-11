import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Public read of Reddit's JSON listings — no auth required, no scraping, no
// ToS violation. We pull recent posts from selected subs, filter by keyword,
// and write a `lead_opportunity` style row into marketplace_leads as a
// `webhook` source with source_channel='scraped'. Contractors then decide
// whether to engage in-thread (Reddit's terms prohibit unsolicited DMs).

const DEFAULT_SUBS = [
  // Generic high-volume subs
  "HomeImprovement", "DIY", "Renovations", "RealEstate", "homeowners",
  "HomeMaintenance", "centuryhomes", "FirstTimeHomeBuyer",
  // Massachusetts-specific
  "boston", "massachusetts", "cambridgema", "somerville",
  "WorcesterMA", "metrowestma", "newengland",
];

const DEFAULT_KEYWORDS = [
  "contractor", "estimate", "quote", "remodel", "renovation",
  "kitchen", "bathroom", "deck", "roof", "siding", "fence", "cleaning",
  "looking for a", "recommend", "anyone know", "trustworthy",
  "hvac", "plumber", "electrician", "painter", "tile", "flooring",
];

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    permalink: string;
    created_utc: number;
    subreddit: string;
    author: string;
    score: number;
  };
}

interface RedditListing {
  data: {
    children: RedditPost[];
  };
}

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET ?? process.env.WEBHOOK_SECRET;
  if (!expected) return true;
  const got = request.headers.get("authorization");
  if (got === `Bearer ${expected}`) return true;
  return request.headers.get("x-cron-secret") === expected;
}

async function pull(subreddit: string): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=50`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "ContractorFlow/1.0 (lead-opportunity-feed)" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as RedditListing;
    return data.data?.children ?? [];
  } catch {
    return [];
  }
}

function matchesKeywords(post: RedditPost, keywords: string[]): boolean {
  const text = `${post.data.title}\n${post.data.selftext}`.toLowerCase();
  return keywords.some((k) => text.includes(k.toLowerCase()));
}

async function runOnce(opts: { subs?: string[]; keywords?: string[] }) {
  const subs = opts.subs && opts.subs.length ? opts.subs : DEFAULT_SUBS;
  const keywords = opts.keywords && opts.keywords.length ? opts.keywords : DEFAULT_KEYWORDS;

  const admin = createAdminClient();

  let fetched = 0;
  let inserted = 0;
  let duplicates = 0;

  for (const sub of subs) {
    const posts = await pull(sub);
    fetched += posts.length;
    for (const p of posts) {
      if (!matchesKeywords(p, keywords)) continue;

      const externalId = `reddit:${p.data.id}`;

      const { data: existing } = await admin
        .from("marketplace_leads").select("id")
        .eq("source_channel", "scraped").eq("external_id", externalId)
        .maybeSingle();
      if (existing) { duplicates++; continue; }

      const title = p.data.title.slice(0, 200);
      const notes = `From r/${p.data.subreddit} by u/${p.data.author}\n\n${p.data.selftext.slice(0, 800)}\n\nThread: https://www.reddit.com${p.data.permalink}`;

      const { error } = await admin.from("marketplace_leads").insert({
        name: `r/${p.data.subreddit} · u/${p.data.author}`,
        service_type: title,
        budget: "unsure",
        timeline: "flexible",
        notes,
        ai_score: 30, // Reddit posts are low-intent until contractor confirms — modest default
        ai_summary: title,
        price_cents: 750,
        source_channel: "scraped",
        external_id: externalId,
        raw_payload: p.data as unknown as Record<string, unknown>,
      });
      if (!error) inserted++;
    }
  }

  await admin.from("scraper_runs").insert({
    source: "reddit",
    region: subs.join(","),
    fetched, inserted, duplicates,
  });

  return { fetched, inserted, duplicates };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const subs = url.searchParams.get("subs")?.split(",").map((s) => s.trim()).filter(Boolean);
  const keywords = url.searchParams.get("kw")?.split(",").map((s) => s.trim()).filter(Boolean);
  const result = await runOnce({ subs, keywords });
  return NextResponse.json({ ok: true, source: "reddit", ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
