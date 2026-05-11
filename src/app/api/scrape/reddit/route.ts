import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Reddit public-JSON harvester. Reads /new.json from each sub (no auth, no
// scraping, no ToS violation), filters posts by keyword, and writes a
// `scraped` marketplace lead per matching thread. Contractors decide whether
// to engage in-thread (Reddit ToS prohibits unsolicited DMs).

const DEFAULT_SUBS = [
  // National high-volume
  "HomeImprovement", "DIY", "Renovations", "RealEstate", "homeowners",
  "HomeMaintenance", "centuryhomes", "FirstTimeHomeBuyer",
  "Plumbing", "Roofing", "Electricians", "Construction", "Flooring",
  "Hvacadvice", "Landscaping", "Carpentry", "Painting", "Drywall",
  "Decks", "RoofingTrade", "tile", "Concrete", "MyHomeImproved",
  "Appliances", "askanelectrician",
  // Massachusetts metro
  "boston", "massachusetts", "cambridgema", "somerville",
  "WorcesterMA", "metrowestma", "newengland",
  "Springfield", "lowell", "lawrence",
  "ProvidenceRI", "RhodeIsland", "Connecticut", "NewHampshire",
  // Major US metros — easy to flip on/off
  "nyc", "AskNYC", "chicago", "LosAngeles", "sandiego", "Seattle",
  "denver", "Atlanta", "Houston", "Dallas", "philadelphia", "Phoenix",
  "Portland", "PortlandOR", "Minneapolis", "PugetSound", "bayarea",
];

const DEFAULT_KEYWORDS = [
  // Direct intent
  "contractor", "estimate", "quote", "looking for a", "recommend",
  "anyone know", "anyone have", "trustworthy", "reputable",
  "hire", "hired", "need help with", "advice on",
  // Services
  "remodel", "renovation", "renovate", "rebuild", "replace",
  "kitchen", "bathroom", "bath remodel", "deck", "fence", "roof",
  "siding", "windows", "flooring", "hardwood", "tile", "carpet",
  "drywall", "painting", "paint", "hvac", "ac unit", "furnace",
  "plumber", "plumbing", "leak", "electrician", "electrical",
  "wiring", "outlet", "panel", "rewire",
  "cleaning", "deep clean", "house clean",
  "landscaping", "lawn", "tree", "fence", "driveway", "concrete",
  "basement", "garage", "addition", "attic", "insulation",
  "gutter", "chimney", "patio", "pool", "shed", "stair",
  "water damage", "mold", "asbestos", "lead paint",
  "general contractor", "GC", "handyman",
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
    num_comments: number;
  };
}

interface RedditListing {
  data: { children: RedditPost[] };
}

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET ?? process.env.WEBHOOK_SECRET;
  if (!expected) return true;
  const got = request.headers.get("authorization");
  if (got === `Bearer ${expected}`) return true;
  return request.headers.get("x-cron-secret") === expected;
}

async function pull(subreddit: string): Promise<RedditPost[]> {
  // /new.json with a generous limit (100 max). Reddit rate-limits ~60 req/min
  // for unauthenticated traffic, well within our usage.
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/new.json?limit=100`,
      {
        headers: { "User-Agent": "ContractorFlow/2.0 (lead-opportunity-feed)" },
        // Reddit blocks responses cached by Vercel's edge — force fresh.
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as RedditListing;
    return data.data?.children ?? [];
  } catch {
    return [];
  }
}

function matchesKeywords(post: RedditPost, keywords: string[]): { hit: boolean; matched: string | null } {
  const text = `${post.data.title}\n${post.data.selftext}`.toLowerCase();
  for (const k of keywords) {
    if (text.includes(k.toLowerCase())) return { hit: true, matched: k };
  }
  return { hit: false, matched: null };
}

function scoreFromMetadata(post: RedditPost): number {
  // Higher base score for posts with more engagement signal — comments
  // imply real interest from the community.
  let score = 30;
  if (post.data.num_comments >= 5) score += 10;
  if (post.data.num_comments >= 20) score += 10;
  if (post.data.score >= 5) score += 5;
  // Penalize very old posts (since /new gives recent, this rarely triggers).
  const ageDays = (Date.now() / 1000 - post.data.created_utc) / 86400;
  if (ageDays > 7) score -= 10;
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

  for (const sub of subs) {
    const posts = (await pull(sub)).slice(0, maxPerSub);
    fetched += posts.length;
    for (const p of posts) {
      const { hit, matched } = matchesKeywords(p, keywords);
      if (!hit) continue;
      const externalId = `reddit:${p.data.id}`;

      const { data: existing } = await admin
        .from("marketplace_leads").select("id")
        .eq("source_channel", "scraped").eq("external_id", externalId)
        .maybeSingle();
      if (existing) { duplicates++; continue; }

      const title = p.data.title.slice(0, 200);
      const notes =
`From r/${p.data.subreddit} · u/${p.data.author} · matched keyword: ${matched}

${p.data.selftext.slice(0, 800)}

Thread: https://www.reddit.com${p.data.permalink}
Score: ${p.data.score} · Comments: ${p.data.num_comments}`;

      const aiScore = scoreFromMetadata(p);
      // Reddit leads are signals, not contact-ready leads, so price them low.
      const priceCents = Math.max(300, Math.round(500 + aiScore * 10));

      const { error } = await admin.from("marketplace_leads").insert({
        name: `r/${p.data.subreddit} · u/${p.data.author}`,
        service_type: title,
        budget: "unsure",
        timeline: "flexible",
        notes,
        ai_score: aiScore,
        ai_summary: title,
        price_cents: priceCents,
        source_channel: "scraped",
        external_id: externalId,
        raw_payload: p.data as unknown as Record<string, unknown>,
      });
      if (!error) inserted++;
    }
  }

  await admin.from("scraper_runs").insert({
    source: "reddit",
    region: subs.slice(0, 5).join(",") + (subs.length > 5 ? `,+${subs.length - 5}` : ""),
    fetched, inserted, duplicates,
  });

  return { fetched, inserted, duplicates, sub_count: subs.length };
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
