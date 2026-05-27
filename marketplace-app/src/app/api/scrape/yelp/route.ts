import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Yelp "Project Requests" — homeowners post jobs on Yelp asking for quotes.
// The board pages are public HTML. We pull a few city × service pages,
// parse the project cards, and create marketplace leads.
//
// Yelp doesn't expose project requests via API — only the consumer-facing
// HTML page. We scrape conservatively (1 req/sec, user-agent identified).
//
// URL pattern: https://www.yelp.com/projects/<service-slug>/<location-slug>
// e.g. https://www.yelp.com/projects/general-contractors/boston-ma

const SERVICES = [
  "general-contractors",
  "roofing",
  "plumbing",
  "electricians",
  "painters",
  "handyman",
  "kitchen-and-bath",
  "landscaping",
  "tree-services",
];

const CITIES = [
  { slug: "boston-ma", name: "Boston, MA" },
  { slug: "worcester-ma", name: "Worcester, MA" },
  { slug: "springfield-ma", name: "Springfield, MA" },
  { slug: "new-york-ny", name: "New York, NY" },
  { slug: "philadelphia-pa", name: "Philadelphia, PA" },
  { slug: "chicago-il", name: "Chicago, IL" },
  { slug: "los-angeles-ca", name: "Los Angeles, CA" },
  { slug: "san-francisco-ca", name: "San Francisco, CA" },
  { slug: "seattle-wa", name: "Seattle, WA" },
  { slug: "atlanta-ga", name: "Atlanta, GA" },
  { slug: "miami-fl", name: "Miami, FL" },
  { slug: "denver-co", name: "Denver, CO" },
  { slug: "austin-tx", name: "Austin, TX" },
  { slug: "dallas-tx", name: "Dallas, TX" },
  { slug: "houston-tx", name: "Houston, TX" },
];

interface YelpProject {
  externalId: string;
  title: string;
  excerpt: string;
  city: string;
  service: string;
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseProjects(html: string, service: string, cityName: string): YelpProject[] {
  // Yelp project cards have a data-testid="project-card" or similar pattern.
  // The HTML is server-rendered. We grab anchor + text segments.
  const out: YelpProject[] = [];
  // Match Project-like blocks containing a /projects/ slug and a title.
  const cardRegex = /<a[^>]+href="\/projects\/[^"]+\/([a-z0-9-]+)"[^>]*>([\s\S]{0,800}?)<\/a>/gi;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = cardRegex.exec(html)) !== null) {
    const slug = m[1];
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const blockHtml = m[2];
    const text = stripHtml(decodeHtml(blockHtml));
    if (text.length < 20) continue;

    // First line is the title, rest is excerpt
    const title = text.split(/[·•|]/)[0]?.trim().slice(0, 140) || text.slice(0, 140);
    out.push({
      externalId: `yelp:${slug}`,
      title,
      excerpt: text.slice(0, 500),
      city: cityName,
      service,
    });
  }
  return out;
}

async function pullCityServicePage(citySlug: string, service: string): Promise<{ entries: YelpProject[]; error: string | null }> {
  const url = `https://www.yelp.com/projects/${service}/${citySlug}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ContractorFlow/1.0; +https://contractorflow.app)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
    });
    if (!res.ok) return { entries: [], error: `HTTP ${res.status}` };
    const html = await res.text();
    if (html.length < 1000) return { entries: [], error: "short page" };
    const city = CITIES.find((c) => c.slug === citySlug)?.name ?? citySlug;
    return { entries: parseProjects(html, service, city), error: null };
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : "fetch failed" };
  }
}

async function runOnce(opts: { cities?: string[]; services?: string[] }) {
  const cities   = opts.cities && opts.cities.length ? opts.cities : CITIES.map((c) => c.slug);
  const services = opts.services && opts.services.length ? opts.services : SERVICES;
  const admin = createAdminClient();

  let totalFetched = 0;
  let inserted = 0;
  let duplicates = 0;
  const errors: Record<string, string> = {};

  for (const citySlug of cities) {
    const city = CITIES.find((c) => c.slug === citySlug)?.name ?? citySlug;
    for (const service of services) {
      const { entries, error } = await pullCityServicePage(citySlug, service);
      if (error) errors[`${citySlug}/${service}`] = error;
      totalFetched += entries.length;

      for (const p of entries) {
        const { data: existing } = await admin
          .from("marketplace_leads").select("id")
          .eq("source_channel", "scraped").eq("external_id", p.externalId)
          .maybeSingle();
        if (existing) { duplicates++; continue; }

        const { error: insErr } = await admin.from("marketplace_leads").insert({
          name: `Yelp project · ${city}`,
          service_type: service.replace(/-/g, " "),
          city,
          budget: "unsure",
          timeline: "flexible",
          notes:
`Yelp homeowner project request
Service: ${service.replace(/-/g, " ")}
Title: ${p.title}

${p.excerpt}

Original: https://www.yelp.com/projects/${service}/${citySlug}`,
          ai_score: 55,
          ai_summary: p.title,
          price_cents: 1200,
          source_channel: "scraped",
          external_id: p.externalId,
          raw_payload: p as unknown as Record<string, unknown>,
        });
        if (!insErr) inserted++;
      }

      // Yelp throttling — gentle pacing
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  await admin.from("scraper_runs").insert({
    source: "yelp_projects",
    region: `${cities.length} cities × ${services.length} services`,
    fetched: totalFetched, inserted, duplicates,
    error: Object.keys(errors).length > 0
      ? `errors on ${Object.keys(errors).length} pages`
      : null,
  });

  return { fetched: totalFetched, inserted, duplicates };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const cities   = url.searchParams.get("cities")?.split(",").map((s) => s.trim()).filter(Boolean);
  const services = url.searchParams.get("services")?.split(",").map((s) => s.trim()).filter(Boolean);
  const result = await runOnce({ cities, services });
  return NextResponse.json({ ok: true, source: "yelp_projects", ...result });
}

export async function POST(request: Request) { return GET(request); }
