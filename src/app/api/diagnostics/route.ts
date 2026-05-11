import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushConfigured } from "@/lib/push";
import { isOutboundConfigured } from "@/lib/messaging";

export const runtime = "nodejs";

// Diagnostics — run on demand to verify every system is wired correctly.
// Returns a JSON report of:
//   - env vars present (without exposing values)
//   - DB tables reachable
//   - scrapers reachable + last-run stats
//   - marketplace inventory health
//   - lead pipeline health
//
// Auth: requires CRON_SECRET via Bearer or x-cron-secret header.

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  if (request.headers.get("authorization") === `Bearer ${expected}`) return true;
  return request.headers.get("x-cron-secret") === expected;
}

async function tableReachable(admin: ReturnType<typeof createAdminClient>, table: string): Promise<{ ok: boolean; count?: number; error?: string }> {
  try {
    const { count, error } = await admin
      .from(table).select("*", { count: "exact", head: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, count: count ?? 0 };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized — pass CRON_SECRET" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1. Env-var checklist
  const env = {
    supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    supabase_service: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    stripe_secret: Boolean(process.env.STRIPE_SECRET_KEY),
    stripe_price_starter: Boolean(process.env.STRIPE_PRICE_STARTER ?? process.env.STRIPE_PRICE_ID),
    stripe_price_growth:  Boolean(process.env.STRIPE_PRICE_GROWTH ?? process.env.STRIPE_PRICE_ID),
    stripe_price_pro:     Boolean(process.env.STRIPE_PRICE_PRO),
    stripe_webhook_secret: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    cron_secret: Boolean(process.env.CRON_SECRET),
    webhook_secret: Boolean(process.env.WEBHOOK_SECRET),
    vapid_public: Boolean(process.env.VAPID_PUBLIC_KEY),
    vapid_public_client: Boolean(process.env.NEXT_PUBLIC_VAPID_KEY),
    vapid_private: Boolean(process.env.VAPID_PRIVATE_KEY),
    twilio: isOutboundConfigured().sms,
    resend: isOutboundConfigured().email,
    meta_verify: Boolean(process.env.META_VERIFY_TOKEN),
    meta_token: Boolean(process.env.META_PAGE_ACCESS_TOKEN),
    push_configured: pushConfigured(),
    app_url: Boolean(process.env.NEXT_PUBLIC_APP_URL),
  };

  // 2. Database tables
  const tables = [
    "profiles", "leads", "customers", "jobs", "invoices", "follow_ups",
    "marketplace_leads", "wallet_transactions", "scraper_runs",
    "auto_bid_rules", "booking_slots", "push_subscriptions",
    "agency_links", "referral_codes", "lead_disputes",
    "partner_widgets", "inbound_messages", "message_log",
    "contractor_reviews", "contractor_credentials",
  ];
  const tableReport: Record<string, { ok: boolean; count?: number; error?: string }> = {};
  for (const t of tables) {
    tableReport[t] = await tableReachable(admin, t);
  }

  // 3. Recent scraper activity (last 7 days)
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: runs } = await admin
    .from("scraper_runs").select("source,fetched,inserted,duplicates,error,ran_at")
    .gte("ran_at", since).order("ran_at", { ascending: false }).limit(50);

  type Run = { source: string; fetched: number; inserted: number; duplicates: number; error: string | null };
  const bySource: Record<string, { runs: number; fetched: number; inserted: number; lastError: string | null }> = {};
  for (const r of ((runs ?? []) as Run[])) {
    const b = bySource[r.source] ?? { runs: 0, fetched: 0, inserted: 0, lastError: null };
    b.runs++; b.fetched += r.fetched; b.inserted += r.inserted;
    if (r.error && !b.lastError) b.lastError = r.error;
    bySource[r.source] = b;
  }

  // 4. Marketplace inventory snapshot
  const { count: availableCount } = await admin
    .from("marketplace_leads").select("id", { count: "exact", head: true })
    .eq("status", "available");
  const { count: soldCount } = await admin
    .from("marketplace_leads").select("id", { count: "exact", head: true })
    .eq("status", "sold");
  const { count: expiredCount } = await admin
    .from("marketplace_leads").select("id", { count: "exact", head: true })
    .eq("status", "expired");

  // 5. Lead pipeline + user counts
  const { count: totalUsers } = await admin
    .from("profiles").select("id", { count: "exact", head: true });
  const { count: contractorCount } = await admin
    .from("profiles").select("id", { count: "exact", head: true })
    .eq("account_type", "contractor");
  const { count: pipelineLeads } = await admin
    .from("leads").select("id", { count: "exact", head: true });

  // 6. Health verdict
  const missingCritical = ["supabase_url", "supabase_anon", "supabase_service"]
    .filter((k) => !(env as Record<string, boolean>)[k]);
  const missingFeature = ["anthropic", "webhook_secret", "cron_secret", "stripe_secret"]
    .filter((k) => !(env as Record<string, boolean>)[k]);
  const tableErrors = Object.entries(tableReport)
    .filter(([, v]) => !v.ok)
    .map(([k, v]) => `${k}: ${v.error}`);

  return NextResponse.json({
    ok: missingCritical.length === 0 && tableErrors.length === 0,
    timestamp: new Date().toISOString(),
    env,
    missingCritical,
    missingFeature,
    tables: tableReport,
    tableErrors,
    scrapers_last_7d: bySource,
    marketplace: {
      available: availableCount ?? 0,
      sold: soldCount ?? 0,
      expired: expiredCount ?? 0,
    },
    users: {
      total: totalUsers ?? 0,
      contractors: contractorCount ?? 0,
      pipeline_leads: pipelineLeads ?? 0,
    },
  });
}
