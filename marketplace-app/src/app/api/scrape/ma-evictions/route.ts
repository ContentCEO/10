import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// MA Housing Court eviction filings → renovation leads.
//
// Eviction filings are PUBLIC RECORD. Landlord wins → tenant vacates →
// unit needs turnover (paint, flooring, cleaning, often plumbing/appliance
// fixes). Landlords are repeat buyers and high-intent.
//
// Massachusetts publishes Housing Court data via Trial Court Public Access
// Portal. No public JSON API, so we accept POST'd CSV-style rows from a
// data vendor or manual export. Same pattern as deeds.

interface EvictionRow {
  docket_number?: string;
  filed_date?: string;
  plaintiff_name?: string;       // landlord
  plaintiff_phone?: string;
  plaintiff_email?: string;
  defendant_name?: string;       // tenant (we don't market to them)
  property_address?: string;
  city?: string;
  zip?: string;
  case_type?: string;
  judgment?: string;             // "Default", "Settled", "Dismissed"
}

function externalIdFor(r: EvictionRow): string | null {
  if (r.docket_number) return `eviction:${r.docket_number}`;
  if (r.property_address && r.filed_date) {
    return `eviction:${Buffer.from(r.property_address + r.filed_date).toString("base64").slice(0, 40)}`;
  }
  return null;
}

async function ingest(rows: EvictionRow[]) {
  const admin = createAdminClient();
  let inserted = 0, duplicates = 0, skipped = 0;

  for (const r of rows) {
    const externalId = externalIdFor(r);
    if (!externalId) { skipped++; continue; }
    if (!r.plaintiff_name && !r.property_address) { skipped++; continue; }

    const { data: existing } = await admin
      .from("marketplace_leads").select("id")
      .eq("source_channel", "scraped").eq("external_id", externalId).maybeSingle();
    if (existing) { duplicates++; continue; }

    const judgmentLine = r.judgment ? `Judgment: ${r.judgment}\n` : "";
    const { error } = await admin.from("marketplace_leads").insert({
      name: r.plaintiff_name ?? "MA landlord",
      phone: r.plaintiff_phone ?? null,
      email: r.plaintiff_email ?? null,
      city: r.city ?? null,
      zip: r.zip ?? null,
      service_type: "Rental unit turnover · paint/flooring/clean",
      budget: "5k_15k",
      timeline: "asap",
      notes:
`Source: MA Housing Court eviction filing (public record).
Docket: ${r.docket_number ?? "(unknown)"}
Filed: ${r.filed_date ?? "(unknown)"}
${judgmentLine}Property: ${r.property_address ?? "(unknown)"}
Case type: ${r.case_type ?? "(unknown)"}

Use case: landlord won/settled eviction → unit will be vacated and
needs turnover. Standard scope: paint, flooring, deep clean, repair
holes, replace appliances if needed. Landlords are repeat buyers.`,
      ai_score: 70,
      ai_summary: `Unit turnover · ${r.city ?? "MA"}`,
      price_cents: 1800,
      source_channel: "scraped",
      external_id: externalId,
      raw_payload: r as unknown as Record<string, unknown>,
    });
    if (!error) inserted++;
  }
  await admin.from("scraper_runs").insert({
    source: "ma_evictions", region: "MA",
    fetched: rows.length, inserted, duplicates,
  });
  return { fetched: rows.length, inserted, duplicates, skipped };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({
      error: "Body must be { rows: [{ docket_number?, filed_date?, plaintiff_name, property_address, city?, zip?, judgment?, ... }, ...] }",
    }, { status: 400 });
  }
  const result = await ingest(body.rows as EvictionRow[]);
  return NextResponse.json({ ok: true, source: "ma_evictions", ...result });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "ma_evictions",
    usage:
      "POST { rows: [{ docket_number, filed_date, plaintiff_name, plaintiff_phone?, plaintiff_email?, property_address, city, zip, judgment, case_type }, ...] }. " +
      "Source: MA Trial Court Public Access Portal exports. Manual paste because the state portal requires interactive search.",
  });
}
