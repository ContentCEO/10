import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BudgetTier } from "@/lib/marketplace";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Cambridge Inspectional Services Department — code violations.
// Source: data.cambridgema.gov Socrata portal (public, no auth).
//
// Same playbook as Boston ISD: open violations = property owners with a
// formal compliance deadline = high-motivation leads.

function classifyBudget(value: number | null): BudgetTier {
  if (value == null) return "unsure";
  if (value < 5_000)  return "under_5k";
  if (value < 15_000) return "5k_15k";
  if (value < 50_000) return "15k_50k";
  return "over_50k";
}

interface ViolationRow {
  violation_id?: string;
  code?: string;
  status?: string;
  description?: string;
  address?: string;
  city?: string;
  zip?: string;
  date_opened?: string;
}

async function fetchCambridgeViolations(limit: number): Promise<ViolationRow[]> {
  const candidates = [
    `https://data.cambridgema.gov/resource/code-violations.json?$limit=${limit}&$order=date_opened DESC`,
    `https://data.cambridgema.gov/resource/violations.json?$limit=${limit}`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!res.ok) continue;
      const rows = (await res.json()) as ViolationRow[];
      if (Array.isArray(rows) && rows.length) return rows;
    } catch { /* try next */ }
  }
  return [];
}

function serviceFromCode(code: string, description: string): { service: string; budget: BudgetTier } {
  const c = (code + " " + description).toLowerCase();
  if (/electric|wiring|panel|outlet|amp/.test(c))      return { service: "Electrical (code violation)",  budget: "5k_15k" };
  if (/plumb|leak|drain|sewer|water heater/.test(c))   return { service: "Plumbing (code violation)",    budget: "5k_15k" };
  if (/hvac|furnace|heat|cool|boiler|venting/.test(c)) return { service: "HVAC (code violation)",        budget: "5k_15k" };
  if (/roof|gutter|drainage|leak/.test(c))             return { service: "Roofing (code violation)",     budget: "15k_50k" };
  if (/siding|paint|exterior/.test(c))                 return { service: "Exterior siding/paint",        budget: "5k_15k" };
  if (/window|glaz/.test(c))                           return { service: "Window replacement",            budget: "5k_15k" };
  if (/stair|rail|porch|balcon/.test(c))               return { service: "Stairs / porch / railing",     budget: "5k_15k" };
  if (/fire|smoke|sprinkler|carbon mon/.test(c))       return { service: "Fire/safety upgrade",          budget: "under_5k" };
  if (/lead paint|asbestos/.test(c))                   return { service: "Hazmat abatement",             budget: "15k_50k" };
  if (/mold|water damage|moisture/.test(c))            return { service: "Mold / water damage",          budget: "5k_15k" };
  if (/structural|foundation|beam/.test(c))            return { service: "Structural repair",            budget: "over_50k" };
  return { service: "Code violation — general repair", budget: "5k_15k" };
}

async function runOnce(opts: { limit?: number }) {
  const limit = opts.limit ?? 100;
  const admin = createAdminClient();
  const rows = await fetchCambridgeViolations(limit);
  let inserted = 0, duplicates = 0, skipped = 0;

  for (const r of rows) {
    if (r.status?.toLowerCase() === "closed") { skipped++; continue; }
    const id = r.violation_id ?? r.code;
    if (!id || !r.address) { skipped++; continue; }
    const externalId = `cambridge_violation:${id}`;

    const { data: existing } = await admin
      .from("marketplace_leads").select("id")
      .eq("source_channel", "scraped").eq("external_id", externalId).maybeSingle();
    if (existing) { duplicates++; continue; }

    const { service, budget } = serviceFromCode(r.code ?? "", r.description ?? "");
    const { error } = await admin.from("marketplace_leads").insert({
      name: "Cambridge property owner",
      city: r.city ?? "Cambridge",
      zip: r.zip ?? null,
      service_type: service,
      budget: classifyBudget(null) === "unsure" ? budget : budget,
      timeline: "asap",
      notes:
`Source: Cambridge Inspectional Services · code violation.
Status: ${r.status ?? "open"}
Opened: ${r.date_opened ?? ""}
Address: ${r.address}, ${r.city ?? "Cambridge"}${r.zip ? " " + r.zip : ""}
Code: ${r.code ?? "(unknown)"}
Description: ${r.description ?? ""}

City has formally notified the owner. Compliance deadlines apply.`,
      ai_score: 70,
      ai_summary: `${service} · ${r.address}, Cambridge`,
      price_cents: 2200,
      source_channel: "scraped",
      external_id: externalId,
      raw_payload: r as unknown as Record<string, unknown>,
    });
    if (!error) inserted++;
  }

  await admin.from("scraper_runs").insert({
    source: "cambridge_inspections", region: "Cambridge",
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
  return NextResponse.json({ ok: true, source: "cambridge_inspections", ...result });
}

export async function POST(request: Request) { return GET(request); }
