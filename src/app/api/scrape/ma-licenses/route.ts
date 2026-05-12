import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// MA state license intake.
//
// Source: elicensing4.hpl.mass.gov + mass.gov license rosters. None of
// these expose a JSON API; data comes as a CSV download from the state
// portal (Construction Supervisor, HIC, Electrician, Plumber, HVAC).
//
// Use case for contractors: NEWLY-licensed contractors are referral
// partner candidates. They're new to the area, building a network,
// looking for subcontracting work, and don't yet have established
// channels. Reach out before competitors do.
//
// Usage:
//   POST /api/scrape/ma-licenses
//   { "rows": [{
//       "license_type": "HIC" | "CSL" | "Electrician" | "Plumber" | "HVAC",
//       "license_number": "...", "name": "...", "company": "...",
//       "phone"?, "email"?, "city"?, "zip"?, "issued_at"?, "expires_at"?
//     }, ...] }
//
// Each row becomes a marketplace lead tagged 'scraped' with external_id
// `ma_license:<type>:<license_number>` for dedup.

interface LicenseRow {
  license_type: string;
  license_number?: string;
  name?: string;
  company?: string;
  phone?: string;
  email?: string;
  city?: string;
  zip?: string;
  issued_at?: string;
  expires_at?: string;
}

function externalIdFor(r: LicenseRow): string {
  const t = (r.license_type ?? "unknown").toLowerCase().replace(/\s+/g, "_");
  const n = (r.license_number ?? Buffer.from((r.name ?? "") + (r.company ?? "")).toString("base64").slice(0, 20)).toString();
  return `ma_license:${t}:${n}`;
}

function serviceLabelFor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("electric")) return "Electrician (licensed)";
  if (t.includes("plumb"))    return "Plumber (licensed)";
  if (t.includes("hvac") || t.includes("refrig")) return "HVAC (licensed)";
  if (t.includes("csl") || t.includes("supervisor")) return "General contractor (CSL)";
  if (t.includes("hic"))      return "Home improvement contractor (HIC)";
  return "Licensed contractor";
}

async function ingest(rows: LicenseRow[]) {
  const admin = createAdminClient();
  let inserted = 0, duplicates = 0, skipped = 0;
  for (const r of rows) {
    if (!r.license_type || !(r.name || r.company)) { skipped++; continue; }
    const externalId = externalIdFor(r);
    const { data: existing } = await admin
      .from("marketplace_leads").select("id")
      .eq("source_channel", "scraped").eq("external_id", externalId).maybeSingle();
    if (existing) { duplicates++; continue; }

    const service = serviceLabelFor(r.license_type);
    const { error } = await admin.from("marketplace_leads").insert({
      name: r.name ?? r.company ?? "Licensed MA contractor",
      phone: r.phone ?? null,
      email: r.email ?? null,
      city: r.city ?? null,
      zip: r.zip ?? null,
      service_type: service,
      budget: "unsure",
      timeline: "flexible",
      notes:
`Source: MA state license roster (public record).
License type: ${r.license_type}
License #:    ${r.license_number ?? "(unknown)"}
Company:      ${r.company ?? "(none)"}
Issued:       ${r.issued_at ?? "(unknown)"}
Expires:      ${r.expires_at ?? "(unknown)"}

Use case: newly-licensed contractors are referral partner candidates.
Reach out about subcontract work, lead sharing, or networking.`,
      ai_score: 40,
      ai_summary: `${service} · ${r.city ?? "MA"}`,
      price_cents: 800,
      source_channel: "scraped",
      external_id: externalId,
      raw_payload: r as unknown as Record<string, unknown>,
    });
    if (!error) inserted++;
  }
  await admin.from("scraper_runs").insert({
    source: "ma_licenses", region: "MA",
    fetched: rows.length, inserted, duplicates,
  });
  return { fetched: rows.length, inserted, duplicates, skipped };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({
      error: "Body must be { rows: [{ license_type, license_number?, name?, company?, phone?, email?, city?, zip?, issued_at?, expires_at? }, ...] }",
    }, { status: 400 });
  }
  const result = await ingest(body.rows as LicenseRow[]);
  return NextResponse.json({ ok: true, source: "ma_licenses", ...result });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "ma_licenses",
    usage:
      "POST { rows: [{ license_type, license_number?, name?, company?, phone?, email?, city?, zip?, issued_at?, expires_at? }, ...] }. " +
      "Source: download CSVs from elicensing4.hpl.mass.gov or mass.gov license rosters. " +
      "Filter to recent issue dates (last 60 days) to surface new license holders for referral outreach.",
  });
}
