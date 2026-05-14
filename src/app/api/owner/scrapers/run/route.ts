import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const ALLOWED_SOURCES = new Set([
  "permits", "reddit", "craigslist", "storms", "rss",
  "nextdoor", "facebook-groups", "deeds",
  "boston-inspections", "cambridge-inspections", "boston-311",
  "ma-municipal", "storm-prep",
  "ma-evictions", "ma-licenses", "sam-gov", "ma-foreclosures", "yelp",
  "state-rfps", "mass-gov-bids", "massdot-projects",
  "ma-school-construction", "serpapi",
  "mirror-marketplace",
]);

// Manual runs are scoped so they always finish under Vercel's timeout.
// Cron schedules still hit the unbounded endpoints for full coverage.
const QUICK_PARAMS: Record<string, string> = {
  permits: "?source=boston_permits&limit=50",
  reddit:  "?subs=HomeImprovement,DIY,Plumbing,Roofing,Electricians,boston,massachusetts,Renovations,homeowners,Construction&limit=20",
};

async function loadHandler(source: string): Promise<((req: Request) => Promise<Response>) | null> {
  try {
    if (source === "mirror-marketplace") {
      const mod = await import("@/app/api/cron/mirror-marketplace/route");
      return mod.GET;
    }
    switch (source) {
      case "permits":                return (await import("@/app/api/scrape/permits/route")).GET;
      case "reddit":                 return (await import("@/app/api/scrape/reddit/route")).GET;
      case "craigslist":             return (await import("@/app/api/scrape/craigslist/route")).GET;
      case "storms":                 return (await import("@/app/api/scrape/storms/route")).GET;
      case "rss":                    return (await import("@/app/api/scrape/rss/route")).GET;
      case "nextdoor":               return (await import("@/app/api/scrape/nextdoor/route")).GET;
      case "facebook-groups":        return (await import("@/app/api/scrape/facebook-groups/route")).GET;
      case "deeds":                  return (await import("@/app/api/scrape/deeds/route")).GET;
      case "boston-inspections":     return (await import("@/app/api/scrape/boston-inspections/route")).GET;
      case "cambridge-inspections":  return (await import("@/app/api/scrape/cambridge-inspections/route")).GET;
      case "boston-311":             return (await import("@/app/api/scrape/boston-311/route")).GET;
      case "ma-municipal":           return (await import("@/app/api/scrape/ma-municipal/route")).GET;
      case "storm-prep":             return (await import("@/app/api/scrape/storm-prep/route")).GET;
      case "ma-evictions":           return (await import("@/app/api/scrape/ma-evictions/route")).GET;
      case "ma-licenses":            return (await import("@/app/api/scrape/ma-licenses/route")).GET;
      case "sam-gov":                return (await import("@/app/api/scrape/sam-gov/route")).GET;
      case "ma-foreclosures":        return (await import("@/app/api/scrape/ma-foreclosures/route")).GET;
      case "yelp":                   return (await import("@/app/api/scrape/yelp/route")).GET;
      case "state-rfps":             return (await import("@/app/api/scrape/state-rfps/route")).GET;
      case "mass-gov-bids":          return (await import("@/app/api/scrape/mass-gov-bids/route")).GET;
      case "massdot-projects":       return (await import("@/app/api/scrape/massdot-projects/route")).GET;
      case "ma-school-construction": return (await import("@/app/api/scrape/ma-school-construction/route")).GET;
      case "serpapi":                return (await import("@/app/api/scrape/serpapi/route")).GET;
      default: return null;
    }
  } catch {
    return null;
  }
}

/*
 * Owner-only "run this scraper now" endpoint. Calls the scraper handler
 * IN-PROCESS via dynamic import. No self-fetch — avoids the network
 * round-trip that was causing "Failed to fetch" in the browser.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 200 });
  }

  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  if (!source || !ALLOWED_SOURCES.has(source)) {
    return NextResponse.json({ ok: false, error: "Unknown source" }, { status: 200 });
  }

  const handler = await loadHandler(source);
  if (!handler) {
    return NextResponse.json({ ok: false, error: `Could not load scraper '${source}'` }, { status: 200 });
  }

  const secret = process.env.CRON_SECRET ?? process.env.WEBHOOK_SECRET ?? "";
  const isCron = source === "mirror-marketplace";
  const target = isCron
    ? `https://internal/api/cron/${source}?secret=${encodeURIComponent(secret)}`
    : `https://internal/api/scrape/${source}${QUICK_PARAMS[source] ?? "?"}${QUICK_PARAMS[source] ? "&" : ""}secret=${encodeURIComponent(secret)}`;

  try {
    const syntheticReq = new Request(target, {
      method: "GET",
      headers: { "x-cron-secret": secret },
    });
    const res = await handler(syntheticReq);
    const text = await res.text();
    let json: unknown = null;
    try { json = JSON.parse(text); } catch { /* not json */ }

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: `Scraper returned ${res.status}`,
        body: json ?? text.slice(0, 400),
      }, { status: 200 });
    }

    let totalFetched = 0, totalInserted = 0;
    if (json && typeof json === "object" && "results" in json) {
      const results = (json as { results: unknown }).results;
      if (results && typeof results === "object") {
        for (const v of Object.values(results as Record<string, { fetched?: number; inserted?: number }>)) {
          totalFetched += v?.fetched ?? 0;
          totalInserted += v?.inserted ?? 0;
        }
      }
    }
    if (json && typeof json === "object") {
      const j = json as { inserted?: number; mirrored?: number; scanned?: number };
      if (typeof j.inserted === "number") totalInserted += j.inserted;
      if (typeof j.mirrored === "number") totalInserted += j.mirrored;
      if (typeof j.scanned === "number")  totalFetched  += j.scanned;
    }

    return NextResponse.json({ ok: true, totalFetched, totalInserted, response: json ?? text });
  } catch (e) {
    const err = e as Error;
    return NextResponse.json({ ok: false, error: err.message ?? "scraper threw" }, { status: 200 });
  }
}
