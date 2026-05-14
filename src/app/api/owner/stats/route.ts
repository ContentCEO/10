import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";

export const runtime = "nodejs";

// Owner overseer stats endpoint. Used by the live overseer panel to
// poll system state every ~15s. Returns:
//   - per-scraper status (last run, fetched/inserted/duplicates, errors)
//   - lead firehose (most recent 50 marketplace_leads)
//   - rollups (today, last hour, by source)
//   - system health (env, DB connection)
//
// Gated by is_admin — non-admins get 403.

interface ScraperStat {
  source: string;
  last_ran_at: string | null;
  last_fetched: number;
  last_inserted: number;
  last_duplicates: number;
  last_error: string | null;
  total_24h_inserted: number;
  total_24h_runs: number;
}

interface LeadRow {
  id: string;
  name: string | null;
  service_type: string | null;
  city: string | null;
  source_channel: string;
  ai_score: number | null;
  price_cents: number;
  status: string;
  created_at: string;
}

export async function GET() {
  // Auth: must be the platform owner.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Not owner" }, { status: 403 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const since1h  = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const sinceToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // ── Scraper runs (last 200) ────────────────────────────────────────
  const { data: runs } = await admin
    .from("scraper_runs")
    .select("source,region,fetched,inserted,duplicates,error,ran_at")
    .gte("ran_at", since24h)
    .order("ran_at", { ascending: false })
    .limit(500);

  const bySource = new Map<string, ScraperStat>();
  for (const r of (runs ?? []) as Array<{
    source: string; region: string | null; fetched: number; inserted: number;
    duplicates: number; error: string | null; ran_at: string;
  }>) {
    if (!bySource.has(r.source)) {
      bySource.set(r.source, {
        source: r.source,
        last_ran_at: r.ran_at,
        last_fetched: r.fetched,
        last_inserted: r.inserted,
        last_duplicates: r.duplicates,
        last_error: r.error,
        total_24h_inserted: 0,
        total_24h_runs: 0,
      });
    }
    const s = bySource.get(r.source)!;
    s.total_24h_inserted += r.inserted ?? 0;
    s.total_24h_runs += 1;
  }
  const scrapers = Array.from(bySource.values())
    .sort((a, b) => (b.last_ran_at ?? "").localeCompare(a.last_ran_at ?? ""));

  // ── Marketplace lead firehose (latest 50) ──────────────────────────
  const { data: latestLeads } = await admin
    .from("marketplace_leads")
    .select("id,name,service_type,city,source_channel,ai_score,price_cents,status,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const leads = (latestLeads ?? []) as LeadRow[];

  // ── Rollups ────────────────────────────────────────────────────────
  const { count: totalLeads }   = await admin.from("marketplace_leads").select("id", { count: "exact", head: true });
  const { count: todayLeads }   = await admin.from("marketplace_leads").select("id", { count: "exact", head: true })
    .gte("created_at", sinceToday);
  const { count: lastHourLeads } = await admin.from("marketplace_leads").select("id", { count: "exact", head: true })
    .gte("created_at", since1h);
  const { count: availableLeads } = await admin.from("marketplace_leads").select("id", { count: "exact", head: true })
    .eq("status", "available");
  const { count: scrapedLeads24h } = await admin.from("marketplace_leads").select("id", { count: "exact", head: true })
    .eq("source_channel", "scraped").gte("created_at", since24h);

  // Source breakdown last 24h
  const { data: sourceBreakdown } = await admin
    .from("marketplace_leads")
    .select("source_channel")
    .gte("created_at", since24h);
  const byChannel = new Map<string, number>();
  for (const row of (sourceBreakdown ?? []) as Array<{ source_channel: string }>) {
    byChannel.set(row.source_channel, (byChannel.get(row.source_channel) ?? 0) + 1);
  }
  const channels = Array.from(byChannel.entries())
    .map(([source_channel, count]) => ({ source_channel, count }))
    .sort((a, b) => b.count - a.count);

  // ── System health ──────────────────────────────────────────────────
  const health = {
    supabase_env:    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    cron_secret:     Boolean(process.env.CRON_SECRET),
    anthropic_key:   Boolean(process.env.ANTHROPIC_API_KEY),
    stripe_key:      Boolean(process.env.STRIPE_SECRET_KEY),
    twilio_sid:      Boolean(process.env.TWILIO_ACCOUNT_SID),
    serpapi_key:     Boolean(process.env.SERPAPI_KEY),
    github_releases: Boolean(process.env.GITHUB_RELEASES_REPO),
    app_url:         Boolean(process.env.NEXT_PUBLIC_APP_URL),
  };

  return NextResponse.json({
    ok: true,
    generated_at: now.toISOString(),
    rollups: {
      total_leads:       totalLeads ?? 0,
      today_leads:       todayLeads ?? 0,
      last_hour_leads:   lastHourLeads ?? 0,
      available_leads:   availableLeads ?? 0,
      scraped_24h:       scrapedLeads24h ?? 0,
    },
    channels,
    scrapers,
    leads,
    health,
  });
}
