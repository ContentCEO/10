import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// SerpAPI integration — paid service that scrapes Google Search safely.
// We run buyer-intent queries across major US cities and capture forum/
// reddit/community results that indicate homeowner intent.
//
// Requires SERPAPI_KEY env var. ~$50/mo for 5000 searches.
// Sign up: https://serpapi.com
//
// Cost model: 1 query = 1 SerpAPI search. We run ~200 queries/day (1 city
// per 5 service-intent template) = 6,000/mo = $50 plan.

interface SerpResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
  source: string;
}

interface SerpResponse {
  organic_results?: SerpResult[];
  related_questions?: { question: string; snippet: string; link?: string }[];
  search_metadata?: { status: string };
}

// Buyer-intent query templates. We rotate through these per city per run.
const QUERY_TEMPLATES = [
  "looking for {service} contractor in {city}",
  "need {service} estimate {city}",
  "best {service} near {city}",
  "{service} reviews {city}",
  "how much does {service} cost {city}",
];

const SERVICES = [
  "roofing", "kitchen remodel", "bathroom remodel",
  "fence install", "deck builder", "painting contractor",
  "plumber", "electrician", "hvac installer",
  "landscaping", "siding", "concrete contractor",
];

// Major US cities — keep small, expensive queries. Owner can extend via env.
const CITIES = [
  "Boston MA", "Worcester MA", "Springfield MA",
  "New York NY", "Brooklyn NY", "Long Island NY",
  "Philadelphia PA", "Pittsburgh PA",
  "Chicago IL", "Detroit MI",
  "Atlanta GA", "Miami FL", "Tampa FL",
  "Houston TX", "Dallas TX", "Austin TX",
  "Los Angeles CA", "San Francisco CA", "San Diego CA",
  "Seattle WA", "Portland OR", "Denver CO", "Phoenix AZ",
];

async function fetchSerp(query: string): Promise<{ entries: SerpResult[]; error: string | null }> {
  const key = process.env.SERPAPI_KEY;
  if (!key) return { entries: [], error: "SERPAPI_KEY not set" };
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=10&api_key=${key}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return { entries: [], error: `HTTP ${res.status}` };
    const data = await res.json() as SerpResponse;
    return { entries: data.organic_results ?? [], error: null };
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : "fetch failed" };
  }
}

function pickService() {
  return SERVICES[Math.floor(Math.random() * SERVICES.length)];
}

function pickTemplate() {
  return QUERY_TEMPLATES[Math.floor(Math.random() * QUERY_TEMPLATES.length)];
}

// Filter: we want results from forums / Reddit / Nextdoor / Quora — places
// homeowners actually express intent. Skip the directories.
function isHighIntent(r: SerpResult): boolean {
  const host = (() => {
    try { return new URL(r.link).hostname.toLowerCase(); } catch { return ""; }
  })();
  if (!host) return false;

  const blocklist = [
    "yelp.com", "angi.com", "homeadvisor.com", "thumbtack.com",
    "houzz.com", "bbb.org", "google.com", "facebook.com/marketplace",
    "yellowpages.com",
  ];
  if (blocklist.some((b) => host.includes(b))) return false;

  // High-intent: forum / community sites
  const highSignal = [
    "reddit.com", "quora.com", "nextdoor.com",
    "forum", "community", "discuss",
  ];
  return highSignal.some((s) => host.includes(s) || r.link.toLowerCase().includes(s));
}

async function runOnce(opts: { cities?: string[]; per_city?: number }) {
  const cities = opts.cities && opts.cities.length ? opts.cities : CITIES;
  const perCity = opts.per_city ?? 2;
  const admin = createAdminClient();

  let totalFetched = 0;
  let inserted = 0;
  let duplicates = 0;
  let lowSignal = 0;
  const errors: Record<string, string> = {};

  for (const city of cities) {
    for (let i = 0; i < perCity; i++) {
      const service = pickService();
      const template = pickTemplate();
      const query = template
        .replace("{service}", service)
        .replace("{city}", city);
      const { entries, error } = await fetchSerp(query);
      if (error) errors[query] = error;
      totalFetched += entries.length;

      for (const r of entries) {
        if (!isHighIntent(r)) { lowSignal++; continue; }
        const externalId = `serp:${Buffer.from(r.link).toString("base64").slice(0, 40)}`;

        const { data: existing } = await admin
          .from("marketplace_leads").select("id")
          .eq("source_channel", "scraped").eq("external_id", externalId)
          .maybeSingle();
        if (existing) { duplicates++; continue; }

        const { error: insErr } = await admin.from("marketplace_leads").insert({
          name: `Google search · ${city}`,
          service_type: service,
          city,
          budget: "unsure",
          timeline: "flexible",
          notes:
`Search query: "${query}"
Title: ${r.title}
Snippet: ${r.snippet}
Source: ${r.source}
URL: ${r.link}`,
          ai_score: 45,
          ai_summary: r.title.slice(0, 200),
          price_cents: 700,
          source_channel: "scraped",
          external_id: externalId,
          raw_payload: r as unknown as Record<string, unknown>,
        });
        if (!insErr) inserted++;
      }
    }
  }

  await admin.from("scraper_runs").insert({
    source: "serpapi", region: `${cities.length} cities × ${perCity} queries`,
    fetched: totalFetched, inserted, duplicates,
    error: Object.keys(errors).length > 0
      ? `errors on ${Object.keys(errors).length} queries (first: ${Object.entries(errors)[0]?.[1] ?? "?"})`
      : null,
  });

  return { fetched: totalFetched, inserted, duplicates, low_signal: lowSignal };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const cities = url.searchParams.get("cities")?.split(",").map((s) => s.trim()).filter(Boolean);
  const perCity = url.searchParams.get("per_city") ? Number(url.searchParams.get("per_city")) : undefined;
  const result = await runOnce({ cities, per_city: perCity });
  return NextResponse.json({ ok: true, source: "serpapi", ...result });
}

export async function POST(request: Request) { return GET(request); }
