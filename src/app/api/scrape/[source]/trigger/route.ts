import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";

export const runtime = "nodejs";

// Plan 1 / Section B / Idea #9 — manual scraper trigger.
//
// POST /api/scrape/<source>/trigger — owner-only. Fires the scraper at
// <source> with the owner's CRON_SECRET so it executes immediately.
//
// Allowed source slugs match folder names under src/app/api/scrape.

const ALLOWED = new Set([
  "reddit", "craigslist", "permits", "storms", "rss",
  "ma-municipal", "mass-gov-bids", "sam-gov", "serpapi", "yelp",
  "state-rfps", "boston-inspections", "boston-311", "massdot-projects",
  "ma-foreclosures", "cambridge-inspections", "ma-school-construction",
]);

export async function POST(request: Request, { params }: { params: { source: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isOwnerEmail(user.email)) return NextResponse.json({ error: "Not owner" }, { status: 403 });

  const source = params.source;
  if (!ALLOWED.has(source)) {
    return NextResponse.json({ error: `Unknown source. Allowed: ${[...ALLOWED].join(", ")}` }, { status: 400 });
  }

  const secret = process.env.CRON_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!secret || !baseUrl) {
    return NextResponse.json({ error: "CRON_SECRET or NEXT_PUBLIC_APP_URL not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${baseUrl}/api/scrape/${source}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: res.ok, source, status: res.status, result: data });
  } catch (e) {
    return NextResponse.json({ ok: false, source, error: e instanceof Error ? e.message : "fetch failed" }, { status: 500 });
  }
}
