import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

export const runtime = "nodejs";

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

/*
 * Owner-only "run this scraper now" endpoint. Forwards to the actual
 * scraper route with the cron secret server-side so the secret never
 * leaves the server. Returns the scraper's JSON response.
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
            ?? `https://${request.headers.get("host") ?? "localhost:3000"}`;

  const isCron = source === "mirror-marketplace";
  const target = isCron ? `${base}/api/cron/${source}` : `${base}/api/scrape/${source}`;

  try {
    const res = await fetch(target, {
      method: "GET",
      headers: secret ? { "x-cron-secret": secret } : {},
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `${res.status} ${res.statusText}`, body: json ?? text }, { status: 502 });
    }

    let totalFetched = 0, totalInserted = 0;
    if (json && typeof json === "object" && "results" in json && (json as { results: unknown }).results && typeof (json as { results: unknown }).results === "object") {
      for (const v of Object.values((json as { results: Record<string, { fetched?: number; inserted?: number }> }).results)) {
        totalFetched += v?.fetched ?? 0;
        totalInserted += v?.inserted ?? 0;
      }
    }

    return NextResponse.json({ ok: true, totalFetched, totalInserted, response: json ?? text });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
