import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Auto-trigger background scraper if it hasn't run in the last hour. Called
// from /opportunities page on load — keeps lead inventory fresh even on
// the Vercel Hobby tier, where cron schedule frequency is limited.
//
// This endpoint is intentionally PUBLIC (no secret) — it can only kick
// off the scraper jobs that already enforce their own secret auth via
// internal fetch. Worst case: an attacker triggers fresh scrapes, which
// helps us more than them.

const STALE_MINUTES = 50;

interface SourceCheck {
  source: string;
  path: string;
}

const SOURCES: SourceCheck[] = [
  { source: "reddit",         path: "/api/scrape/reddit" },
  { source: "craigslist",     path: "/api/scrape/craigslist" },
  { source: "boston_permits", path: "/api/scrape/permits?source=boston_permits" },
  { source: "noaa_storms",    path: "/api/scrape/storms?states=MA,NY,RI,NH,CT,VT,ME" },
  { source: "rss_universal",  path: "/api/scrape/rss" },
];

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const secret = process.env.CRON_SECRET;
  if (!baseUrl || !secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - STALE_MINUTES * 60_000).toISOString();
  const triggered: string[] = [];

  for (const src of SOURCES) {
    const { data: lastRun } = await admin
      .from("scraper_runs").select("ran_at")
      .eq("source", src.source)
      .order("ran_at", { ascending: false })
      .limit(1).maybeSingle();
    if (!lastRun || lastRun.ran_at < cutoff) {
      // Fire and forget — we don't await so the page load isn't blocked.
      fetch(`${baseUrl}${src.path}`, {
        headers: { Authorization: `Bearer ${secret}` },
      }).catch(() => {});
      triggered.push(src.source);
    }
  }
  return NextResponse.json({ ok: true, triggered });
}
