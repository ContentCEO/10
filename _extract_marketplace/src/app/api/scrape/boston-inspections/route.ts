import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BudgetTier } from "@/lib/marketplace";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Boston Inspectional Services Department (ISD) violations + 311 building
// inspection requests. Source: data.boston.gov CKAN datastore (public,
// no auth, encouraged use).
//
// Code violations and failed inspections are LEAD GOLD: the property
// owner has been formally told by the city that work needs doing.
// Compliance deadlines force action. The owner is highly motivated.

function classifyBudget(value: number | null): BudgetTier {
  if (value == null) return "unsure";
  if (value < 5_000)  return "under_5k";
  if (value < 15_000) return "5k_15k";
  if (value < 50_000) return "15k_50k";
  return "over_50k";
}

interface CkanResponse<T> {
  result?: { records?: T[] };
}

// ── Boston Code Enforcement violations ───────────────────────────────
// Dataset: https://data.boston.gov/dataset/code-enforcement
interface ViolationRow {
  case_no?: string;
  status?: string;
  status_dttm?: string;
  code?: string;
  value?: string | null;
  description?: string;
  violation_stno?: string;
  violation_street?: string;
  violation_suffix?: string;
  violation_city?: string;
  violation_zip?: string;
  ward?: string;
  contact_addr1?: string | null;
}

async function fetchBostonViolations(limit: number) {
  const url = `https://data.boston.gov/api/3/action/datastore_search?resource_id=890273b9-bf0f-4ab1-bfa7-09c10fee36ae&limit=${limit}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json() as CkanResponse<ViolationRow>;
    const records = data.result?.records ?? [];
    return records
      .filter((r) => r.status?.toLowerCase() !== "closed")
      .map((r) => ({
        externalId: `boston_violation:${r.case_no ?? r.code ?? ""}`,
        addr: [r.violation_stno, r.violation_street, r.violation_suffix].filter(Boolean).join(" ").trim(),
        city: r.violation_city || "Boston",
        zip: r.violation_zip ?? null,
        code: r.code ?? "(unknown code)",
        description: r.description ?? "",
        opened_at: r.status_dttm ?? "",
        status: r.status ?? "OPEN",
        raw: r as unknown as Record<string, unknown>,
      }))
      .filter((r) => r.externalId !== "boston_violation:");
  } catch {
    return [];
  }
}

// Map common Boston code references to contractor service categories.
function serviceFromCode(code: string, description: string): { service: string; budget: BudgetTier } {
  const c = (code + " " + description).toLowerCase();

  if (/electric|wiring|panel|outlet|amp/.test(c))       return { service: "Electrical (code violation)",   budget: "5k_15k" };
  if (/plumb|leak|drain|sewer|water heater/.test(c))    return { service: "Plumbing (code violation)",     budget: "5k_15k" };
  if (/hvac|furnace|heat|cool|boiler|venting/.test(c))  return { service: "HVAC (code violation)",         budget: "5k_15k" };
  if (/roof|gutter|drainage|leak/.test(c))              return { service: "Roofing (code violation)",      budget: "15k_50k" };
  if (/siding|paint|exterior/.test(c))                  return { service: "Exterior siding/paint",         budget: "5k_15k" };
  if (/window|glaz/.test(c))                            return { service: "Window replacement",             budget: "5k_15k" };
  if (/stair|rail|porch|balcon/.test(c))                return { service: "Stairs / porch / railing",      budget: "5k_15k" };
  if (/fire|smoke|sprinkler|carbon mon/.test(c))        return { service: "Fire/safety upgrade",           budget: "under_5k" };
  if (/lead paint|asbestos/.test(c))                    return { service: "Hazmat abatement",              budget: "15k_50k" };
  if (/mold|water damage|moisture/.test(c))             return { service: "Mold / water damage",           budget: "5k_15k" };
  if (/structural|foundation|beam/.test(c))             return { service: "Structural repair",             budget: "over_50k" };
  if (/sanitar|trash|rodent|pest/.test(c))              return { service: "Sanitation / pest",             budget: "under_5k" };
  return { service: "Code violation — general repair", budget: "5k_15k" };
}

async function runOnce(opts: { limit?: number }) {
  const limit = opts.limit ?? 200;
  const admin = createAdminClient();
  const rows = await fetchBostonViolations(limit);
  let inserted = 0, duplicates = 0, skipped = 0;
  for (const r of rows) {
    if (!r.addr) { skipped++; continue; }
    const { data: existing } = await admin
      .from("marketplace_leads").select("id")
      .eq("source_channel", "scraped").eq("external_id", r.externalId).maybeSingle();
    if (existing) { duplicates++; continue; }

    const { service, budget } = serviceFromCode(r.code, r.description);
    const { error } = await admin.from("marketplace_leads").insert({
      name: "Boston property owner",
      city: r.city,
      zip: r.zip,
      service_type: service,
      budget,
      timeline: "asap",
      notes:
`Source: Boston Inspectional Services Department · code violation.
Status: ${r.status}
Opened: ${r.opened_at}
Address: ${r.addr}, ${r.city}${r.zip ? " " + r.zip : ""}
Violation code: ${r.code}
Description: ${r.description}

Property owner has been formally notified by the city. Compliance
deadlines apply — high motivation to hire quickly.`,
      ai_score: 75,
      ai_summary: `${service} · ${r.addr}, Boston`,
      price_cents: 2500,
      source_channel: "scraped",
      external_id: r.externalId,
      raw_payload: r.raw,
    });
    if (!error) inserted++;
  }
  await admin.from("scraper_runs").insert({
    source: "boston_inspections", region: "Boston",
    fetched: rows.length, inserted, duplicates,
  });
  return { fetched: rows.length, inserted, duplicates, skipped };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const result = await runOnce({
    limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
  });
  return NextResponse.json({ ok: true, source: "boston_inspections", ...result });
}

export async function POST(request: Request) { return GET(request); }
