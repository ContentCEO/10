import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// SAM.gov contract opportunities for construction-related work.
// Public RSS feed of active contract opportunities. We filter by NAICS codes
// in the 23xxxx range (Construction) and related ones.
//
// Each opportunity → marketplace lead. These are 6-figure to 8-figure jobs;
// price the lead at $50 (top tier — federal-grade opportunity).
//
// NAICS construction codes we care about:
//   2361 Residential building
//   2362 Nonresidential building
//   2371 Utility system construction
//   2372 Land subdivision
//   2373 Highway/street/bridge
//   2379 Other heavy construction
//   2381 Foundation/structure/exterior
//   2382 Building equipment (electrical/plumbing/HVAC)
//   2383 Building finishing
//   2389 Other specialty trade

interface SamOpp {
  noticeId: string;
  title: string;
  solicitationNumber: string | null;
  description: string | null;
  postedDate: string;
  responseDeadLine: string | null;
  naicsCode: string | null;
  classificationCode: string | null;
  placeOfPerformance?: {
    city?: { name?: string };
    state?: { code?: string };
    zip?: string;
  };
  organizationType: string | null;
  fullParentPathName: string | null;
  uiLink: string | null;
}

const CONSTRUCTION_NAICS_PREFIXES = ["236", "237", "238"];
const KEYWORD_TERMS = [
  "construction", "renovation", "remodel", "build",
  "roof", "hvac", "plumbing", "electrical", "painting",
  "concrete", "masonry", "flooring", "drywall",
  "demolition", "siding", "windows", "doors",
  "landscaping", "paving", "sewer", "water main",
];

async function fetchOpportunities(limit: number): Promise<{ entries: SamOpp[]; error: string | null }> {
  // SAM.gov opportunities API. Public endpoint. We pull recent opps and
  // filter client-side because their API filter syntax is finicky.
  // Date range: last 14 days.
  const posted = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10).replace(/-/g, "/");
  const url = `https://api.sam.gov/opportunities/v2/search?limit=${limit}&postedFrom=${posted}&ptype=k,o,p,r&api_key=${process.env.SAM_GOV_API_KEY ?? "DEMO_KEY"}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return { entries: [], error: `HTTP ${res.status}` };
    const data = await res.json() as { opportunitiesData?: SamOpp[] };
    return { entries: data.opportunitiesData ?? [], error: null };
  } catch (e) {
    return { entries: [], error: e instanceof Error ? e.message : "fetch failed" };
  }
}

function isRelevant(opp: SamOpp): boolean {
  if (opp.naicsCode && CONSTRUCTION_NAICS_PREFIXES.some((p) => opp.naicsCode!.startsWith(p))) {
    return true;
  }
  const text = `${opp.title} ${opp.description ?? ""}`.toLowerCase();
  return KEYWORD_TERMS.some((k) => text.includes(k));
}

async function runOnce(opts: { limit?: number }) {
  const limit = Math.min(opts.limit ?? 200, 1000);
  const admin = createAdminClient();
  const { entries, error } = await fetchOpportunities(limit);

  let inserted = 0, duplicates = 0, skipped = 0;
  for (const opp of entries) {
    if (!isRelevant(opp)) { skipped++; continue; }

    const externalId = `samgov:${opp.noticeId}`;
    const { data: existing } = await admin
      .from("marketplace_leads").select("id")
      .eq("source_channel", "scraped").eq("external_id", externalId).maybeSingle();
    if (existing) { duplicates++; continue; }

    const place = opp.placeOfPerformance;
    const city = place?.city?.name ?? null;
    const state = place?.state?.code ?? null;
    const zip = place?.zip ?? null;

    const { error: insErr } = await admin.from("marketplace_leads").insert({
      name: opp.fullParentPathName?.slice(0, 200) || "Federal agency",
      service_type: opp.title.slice(0, 200),
      notes: [
        opp.description?.slice(0, 1000),
        opp.solicitationNumber ? `Solicitation: ${opp.solicitationNumber}` : null,
        opp.naicsCode ? `NAICS: ${opp.naicsCode}` : null,
        opp.responseDeadLine ? `Response due: ${opp.responseDeadLine}` : null,
        opp.uiLink ? `Full listing: ${opp.uiLink}` : null,
      ].filter(Boolean).join("\n\n"),
      city: city ? `${city}${state ? ", " + state : ""}` : state,
      zip,
      budget: "over_50k",
      timeline: "one_to_three_months",
      ai_score: 80,
      ai_summary: opp.title.slice(0, 200),
      price_cents: 5000,
      source_channel: "scraped",
      external_id: externalId,
      raw_payload: opp as unknown as Record<string, unknown>,
    });
    if (!insErr) inserted++;
  }

  await admin.from("scraper_runs").insert({
    source: "sam_gov", region: "US federal",
    fetched: entries.length, inserted, duplicates, error,
  });

  return { fetched: entries.length, inserted, duplicates, skipped, error };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const result = await runOnce({
    limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
  });
  return NextResponse.json({ ok: true, source: "sam_gov", ...result });
}

export async function POST(request: Request) { return GET(request); }
