import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

export const runtime = "nodejs";
export const maxDuration = 60;

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

// Manual runs are scoped tight so they always finish under Vercel's
// function timeout. The full multi-city scrape still happens on cron.
const QUICK_PARAMS: Record<string, string> = {
  permits: "source=boston_permits&limit=50",
};

/*
 * Owner-only "run this scraper now" endpoint. Forwards to the actual
 * scraper route with the cron secret server-side. Bounded to 50s so it
 * always replies before Vercel kills the function.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const source = url.searchParams.get("source");
  if (!source || !ALLOWED_SOURCES.has(source)) {
    return NextResponse.json({ error: "Unknown source" }, { status: 400 });
  }

  const secret = process.env.CRON_SECRET ?? process.env.WEBHOOK_SECRET;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
            ?? `${url.protocol}//${request.headers.get("host") ?? url.host}`;

  const isCron = source === "mirror-marketplace";
  const quick = QUICK_PARAMS[source];
  const target = isCron
    ? `${base}/api/cron/${source}`
    : `${base}/api/scrape/${source}${quick ? `?${quick}` : ""}`;

  // Hard 50s budget so we always respond before Vercel's 60s kill.
  const abort = new AbortController();
  const watchdog = setTimeout(() => abort.abort(), 50_000);

  try {
    const res = await fetch(target, {
      method: "GET",
      headers: secret ? { "x-cron-secret": secret } : {},
      cache: "no-store",
      signal: abort.signal,
    });
    clearTimeout(watchdog);

    const text = await res.text();
    let json: unknown = null;
    try { json = JSON.parse(text); } catch { /* not json */ }

    if (!res.ok) {
      return NextResponse.json({
        ok: false,
        error: `Scraper returned ${res.status}: ${typeof json === "object" && json && "error" in json ? (json as { error: unknown }).error : res.statusText}`,
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
    if (json && typeof json === "object" && "inserted" in json) {
      totalInserted += Number((json as { inserted?: number }).inserted ?? 0);
    }
    if (json && typeof json === "object" && "mirrored" in json) {
      totalInserted += Number((json as { mirrored?: number }).mirrored ?? 0);
      totalFetched += Number((json as { scanned?: number }).scanned ?? 0);
    }

    return NextResponse.json({ ok: true, totalFetched, totalInserted, response: json ?? text });
  } catch (e) {
    clearTimeout(watchdog);
    const err = e as Error;
    if (err.name === "AbortError") {
      return NextResponse.json({
        ok: false,
        error: "Scraper still running after 50s — refresh in a minute to see results.",
      }, { status: 200 });
    }
    return NextResponse.json({ ok: false, error: err.message ?? "fetch failed" }, { status: 200 });
  }
}
