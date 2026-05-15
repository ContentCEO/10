import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BudgetTier } from "@/lib/marketplace";
import { enrichPhone, isQualifiedLead, isMassachusettsLead } from "@/lib/lead-quality";

export const runtime = "nodejs";

// Public-records permit ingestion across major US cities. All sources below
// are Socrata- or ArcGIS-backed open data portals — public records, no auth,
// encouraged use. Budget tier is inferred from reported cost.

import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

function classifyBudget(value: number | null): BudgetTier {
  if (value == null) return "unsure";
  if (value < 5_000)   return "under_5k";
  if (value < 15_000)  return "5k_15k";
  if (value < 50_000)  return "15k_50k";
  return "over_50k";
}

interface PermitLead {
  externalId: string;
  name: string;
  address: string | null;
  zip: string | null;
  city: string | null;
  service_type: string;
  estimated_cost: number | null;
  notes: string;
  raw: Record<string, unknown>;
}

interface CitySource {
  key: string;
  city: string;
  fetch: (limit: number) => Promise<PermitLead[]>;
}

async function fetchSocrata<T>(url: string): Promise<T[]> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    return (await res.json()) as T[];
  } catch {
    return [];
  }
}

// ---------- Boston (CKAN datastore) ----------
interface BostonRow {
  permitnumber: string;
  worktype: string | null;
  permittypedescr: string | null;
  description: string | null;
  declared_valuation: string | null;
  address: string | null;
  city: string | null;
  zip: string | null;
  owner: string | null;
}
async function fetchBoston(limit: number): Promise<PermitLead[]> {
  try {
    const res = await fetch(
      `https://data.boston.gov/api/3/action/datastore_search?resource_id=6ddcd912-32a0-43df-9908-63574f8c7e77&limit=${limit}`,
    );
    if (!res.ok) return [];
    const data = await res.json();
    const records: BostonRow[] = data?.result?.records ?? [];
    return records.map((r) => ({
      externalId: `boston:${r.permitnumber}`,
      name: r.owner || "Boston permit holder",
      address: r.address || null,
      zip: r.zip || null,
      city: r.city || "Boston",
      service_type: r.permittypedescr || r.worktype || r.description?.slice(0, 60) || "Permit",
      estimated_cost: r.declared_valuation ? Number(r.declared_valuation.replace(/[^0-9.]/g, "")) : null,
      notes: r.description ?? "",
      raw: r as unknown as Record<string, unknown>,
    }));
  } catch {
    return [];
  }
}

// ---------- Cambridge ----------
interface CambridgeRow {
  permitnumber: string;
  permit_type_description: string | null;
  description: string | null;
  declared_valuation: string | null;
  address: string | null;
  zip_code: string | null;
  owner: string | null;
}
async function fetchCambridge(limit: number): Promise<PermitLead[]> {
  const rows = await fetchSocrata<CambridgeRow>(
    `https://data.cambridgema.gov/resource/wmsk-c84u.json?$limit=${limit}`,
  );
  return rows.map((r) => ({
    externalId: `cambridge:${r.permitnumber}`,
    name: r.owner || "Cambridge permit holder",
    address: r.address || null,
    zip: r.zip_code || null,
    city: "Cambridge",
    service_type: r.permit_type_description || r.description?.slice(0, 60) || "Permit",
    estimated_cost: r.declared_valuation ? Number(r.declared_valuation.replace(/[^0-9.]/g, "")) : null,
    notes: r.description ?? "",
    raw: r as unknown as Record<string, unknown>,
  }));
}

// ---------- Somerville ----------
interface SomervilleRow {
  permit_id: string;
  permit_type: string | null;
  description: string | null;
  estimated_value: string | null;
  address: string | null;
  zip_code: string | null;
  applicant_name: string | null;
}
async function fetchSomerville(limit: number): Promise<PermitLead[]> {
  const rows = await fetchSocrata<SomervilleRow>(
    `https://data.somervillema.gov/resource/spx7-7nzw.json?$limit=${limit}`,
  );
  return rows.map((r) => ({
    externalId: `somerville:${r.permit_id}`,
    name: r.applicant_name || "Somerville permit holder",
    address: r.address || null,
    zip: r.zip_code || null,
    city: "Somerville",
    service_type: r.permit_type || r.description?.slice(0, 60) || "Permit",
    estimated_cost: r.estimated_value ? Number(r.estimated_value.replace(/[^0-9.]/g, "")) : null,
    notes: r.description ?? "",
    raw: r as unknown as Record<string, unknown>,
  }));
}

// ---------- NYC ----------
interface NYCRow {
  job__: string;
  job_type: string;
  job_description: string | null;
  initial_cost: string | null;
  borough: string | null;
  zip__: string | null;
  house__: string | null;
  street_name: string | null;
  owner_s_first_name: string | null;
  owner_s_last_name: string | null;
  job_status_descrp: string | null;
}
async function fetchNyc(limit: number): Promise<PermitLead[]> {
  const rows = await fetchSocrata<NYCRow>(
    `https://data.cityofnewyork.us/resource/ic3t-wcy2.json?$limit=${limit}&$order=pre__filing_date DESC`,
  );
  return rows.map((r) => {
    const owner = [r.owner_s_first_name, r.owner_s_last_name].filter(Boolean).join(" ").trim();
    const addr = [r.house__, r.street_name].filter(Boolean).join(" ").trim();
    const cost = r.initial_cost ? Number(r.initial_cost.replace(/[^0-9.]/g, "")) : null;
    return {
      externalId: `nyc:${r.job__}`,
      name: owner || "NYC permit holder",
      address: addr || null,
      zip: r.zip__ || null,
      city: r.borough || "New York",
      service_type: r.job_type || r.job_description?.slice(0, 60) || "Building permit",
      estimated_cost: Number.isFinite(cost) ? cost : null,
      notes: [r.job_description, `Status: ${r.job_status_descrp ?? "unknown"}`].filter(Boolean).join(" · "),
      raw: r as unknown as Record<string, unknown>,
    };
  });
}

// ---------- Chicago ----------
interface ChicagoRow {
  id: string;
  permit_type: string | null;
  work_description: string | null;
  reported_cost: string | null;
  street_number: string | null;
  street_direction: string | null;
  street_name: string | null;
  suffix: string | null;
  zip_code: string | null;
  contact_1_name: string | null;
}
async function fetchChicago(limit: number): Promise<PermitLead[]> {
  const rows = await fetchSocrata<ChicagoRow>(
    `https://data.cityofchicago.org/resource/ydr8-5enu.json?$limit=${limit}&$order=application_start_date DESC`,
  );
  return rows.map((r) => {
    const addr = [r.street_number, r.street_direction, r.street_name, r.suffix].filter(Boolean).join(" ").trim();
    const cost = r.reported_cost ? Number(r.reported_cost.replace(/[^0-9.]/g, "")) : null;
    return {
      externalId: `chicago:${r.id}`,
      name: r.contact_1_name || "Chicago permit holder",
      address: addr || null,
      zip: r.zip_code || null,
      city: "Chicago",
      service_type: r.permit_type || r.work_description?.slice(0, 60) || "Building permit",
      estimated_cost: Number.isFinite(cost) ? cost : null,
      notes: r.work_description || "",
      raw: r as unknown as Record<string, unknown>,
    };
  });
}

// ---------- Lowell ----------
interface LowellRow {
  permit_number: string;
  permit_type: string | null;
  description: string | null;
  estimated_cost: string | null;
  address: string | null;
  applicant_name: string | null;
  zip: string | null;
}
async function fetchLowell(limit: number): Promise<PermitLead[]> {
  const rows = await fetchSocrata<LowellRow>(
    `https://data.lowellma.gov/resource/u4ye-bda4.json?$limit=${limit}`,
  );
  return rows.map((r) => ({
    externalId: `lowell:${r.permit_number}`,
    name: r.applicant_name || "Lowell permit holder",
    address: r.address || null,
    zip: r.zip || null,
    city: "Lowell",
    service_type: r.permit_type || r.description?.slice(0, 60) || "Permit",
    estimated_cost: r.estimated_cost ? Number(r.estimated_cost.replace(/[^0-9.]/g, "")) : null,
    notes: r.description ?? "",
    raw: r as unknown as Record<string, unknown>,
  }));
}

// ---------- Los Angeles ----------
interface LARow {
  pcis_permit_no: string;
  permit_type: string | null;
  permit_sub_type: string | null;
  work_description: string | null;
  valuation: string | null;
  address_start: string | null;
  street_name: string | null;
  zip_code: string | null;
  applicant_first_name: string | null;
  applicant_last_name: string | null;
}
async function fetchLA(limit: number): Promise<PermitLead[]> {
  const rows = await fetchSocrata<LARow>(
    `https://data.lacity.org/resource/nbyu-2ha9.json?$limit=${limit}&$order=issue_date DESC`,
  );
  return rows.map((r) => {
    const owner = [r.applicant_first_name, r.applicant_last_name].filter(Boolean).join(" ").trim();
    const addr = [r.address_start, r.street_name].filter(Boolean).join(" ").trim();
    const cost = r.valuation ? Number(r.valuation.replace(/[^0-9.]/g, "")) : null;
    return {
      externalId: `la:${r.pcis_permit_no}`,
      name: owner || "LA permit holder",
      address: addr || null,
      zip: r.zip_code || null,
      city: "Los Angeles",
      service_type: r.permit_sub_type || r.permit_type || r.work_description?.slice(0, 60) || "Permit",
      estimated_cost: Number.isFinite(cost) ? cost : null,
      notes: r.work_description ?? "",
      raw: r as unknown as Record<string, unknown>,
    };
  });
}

// ---------- San Francisco ----------
interface SFRow {
  permit_number: string;
  permit_type_definition: string | null;
  description: string | null;
  estimated_cost: string | null;
  street_number: string | null;
  street_name: string | null;
  zipcode: string | null;
}
async function fetchSF(limit: number): Promise<PermitLead[]> {
  const rows = await fetchSocrata<SFRow>(
    `https://data.sfgov.org/resource/i98e-djp9.json?$limit=${limit}&$order=filed_date DESC`,
  );
  return rows.map((r) => {
    const addr = [r.street_number, r.street_name].filter(Boolean).join(" ").trim();
    const cost = r.estimated_cost ? Number(r.estimated_cost.replace(/[^0-9.]/g, "")) : null;
    return {
      externalId: `sf:${r.permit_number}`,
      name: "SF permit holder",
      address: addr || null,
      zip: r.zipcode || null,
      city: "San Francisco",
      service_type: r.permit_type_definition || r.description?.slice(0, 60) || "Permit",
      estimated_cost: Number.isFinite(cost) ? cost : null,
      notes: r.description ?? "",
      raw: r as unknown as Record<string, unknown>,
    };
  });
}

// ---------- Seattle ----------
interface SeattleRow {
  permit_number: string;
  permit_type: string | null;
  description: string | null;
  estimated_project_cost: string | null;
  address: string | null;
  original_zip: string | null;
  applicant_name: string | null;
}
async function fetchSeattle(limit: number): Promise<PermitLead[]> {
  const rows = await fetchSocrata<SeattleRow>(
    `https://data.seattle.gov/resource/76t5-zqzr.json?$limit=${limit}&$order=application_date DESC`,
  );
  return rows.map((r) => {
    const cost = r.estimated_project_cost ? Number(r.estimated_project_cost.replace(/[^0-9.]/g, "")) : null;
    return {
      externalId: `seattle:${r.permit_number}`,
      name: r.applicant_name || "Seattle permit holder",
      address: r.address || null,
      zip: r.original_zip || null,
      city: "Seattle",
      service_type: r.permit_type || r.description?.slice(0, 60) || "Permit",
      estimated_cost: Number.isFinite(cost) ? cost : null,
      notes: r.description ?? "",
      raw: r as unknown as Record<string, unknown>,
    };
  });
}

// ---------- Austin ----------
interface AustinRow {
  permit_num: string;
  permit_type_desc: string | null;
  description: string | null;
  total_valuation_remodel: string | null;
  original_address1: string | null;
  original_zip: string | null;
  applicant_full_name: string | null;
}
async function fetchAustin(limit: number): Promise<PermitLead[]> {
  const rows = await fetchSocrata<AustinRow>(
    `https://data.austintexas.gov/resource/3syk-w9eu.json?$limit=${limit}&$order=applied_date DESC`,
  );
  return rows.map((r) => {
    const cost = r.total_valuation_remodel ? Number(r.total_valuation_remodel.replace(/[^0-9.]/g, "")) : null;
    return {
      externalId: `austin:${r.permit_num}`,
      name: r.applicant_full_name || "Austin permit holder",
      address: r.original_address1 || null,
      zip: r.original_zip || null,
      city: "Austin",
      service_type: r.permit_type_desc || r.description?.slice(0, 60) || "Permit",
      estimated_cost: Number.isFinite(cost) ? cost : null,
      notes: r.description ?? "",
      raw: r as unknown as Record<string, unknown>,
    };
  });
}

// ---------- Dallas ----------
interface DallasRow {
  permit_number: string;
  type_description: string | null;
  work_description: string | null;
  estimated_value: string | null;
  address: string | null;
  zip: string | null;
  contact_name: string | null;
}
async function fetchDallas(limit: number): Promise<PermitLead[]> {
  const rows = await fetchSocrata<DallasRow>(
    `https://www.dallasopendata.com/resource/e7gq-4sah.json?$limit=${limit}&$order=issued_date DESC`,
  );
  return rows.map((r) => {
    const cost = r.estimated_value ? Number(r.estimated_value.replace(/[^0-9.]/g, "")) : null;
    return {
      externalId: `dallas:${r.permit_number}`,
      name: r.contact_name || "Dallas permit holder",
      address: r.address || null,
      zip: r.zip || null,
      city: "Dallas",
      service_type: r.type_description || r.work_description?.slice(0, 60) || "Permit",
      estimated_cost: Number.isFinite(cost) ? cost : null,
      notes: r.work_description ?? "",
      raw: r as unknown as Record<string, unknown>,
    };
  });
}

// ---------- Washington DC ----------
interface DCRow {
  permit_number: string;
  permit_type: string | null;
  description_of_work: string | null;
  fees_paid: string | null;
  full_address: string | null;
  zipcode: string | null;
}
async function fetchDC(limit: number): Promise<PermitLead[]> {
  const rows = await fetchSocrata<DCRow>(
    `https://opendata.dc.gov/api/feed/dataset/construction-permits-issued-in-dc-7.geojson?$limit=${limit}`,
  );
  return rows.map((r) => ({
    externalId: `dc:${r.permit_number}`,
    name: "DC permit holder",
    address: r.full_address || null,
    zip: r.zipcode || null,
    city: "Washington",
    service_type: r.permit_type || r.description_of_work?.slice(0, 60) || "Permit",
    estimated_cost: null,
    notes: r.description_of_work ?? "",
    raw: r as unknown as Record<string, unknown>,
  }));
}

// ---------- Detroit ----------
interface DetroitRow {
  permit_no: string;
  permit_type: string | null;
  description: string | null;
  estimated_cost: string | null;
  site_address: string | null;
  parcel_zip_code: string | null;
}
async function fetchDetroit(limit: number): Promise<PermitLead[]> {
  const rows = await fetchSocrata<DetroitRow>(
    `https://data.detroitmi.gov/resource/but4-ky7y.json?$limit=${limit}&$order=permit_issued DESC`,
  );
  return rows.map((r) => {
    const cost = r.estimated_cost ? Number(r.estimated_cost.replace(/[^0-9.]/g, "")) : null;
    return {
      externalId: `detroit:${r.permit_no}`,
      name: "Detroit permit holder",
      address: r.site_address || null,
      zip: r.parcel_zip_code || null,
      city: "Detroit",
      service_type: r.permit_type || r.description?.slice(0, 60) || "Permit",
      estimated_cost: Number.isFinite(cost) ? cost : null,
      notes: r.description ?? "",
      raw: r as unknown as Record<string, unknown>,
    };
  });
}

// ---------- Generic Socrata fetcher (for cities we add without typed schemas) ----------
async function fetchGenericPermits(
  city: string,
  url: string,
  fieldMap: { id: string; type?: string; desc?: string; cost?: string; addr?: string; zip?: string; owner?: string },
): Promise<PermitLead[]> {
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return [];
    const rows = (await res.json()) as Record<string, unknown>[];
    return rows.map((r) => {
      const idVal = String(r[fieldMap.id] ?? "");
      const cost = r[fieldMap.cost ?? ""]
        ? Number(String(r[fieldMap.cost ?? ""]).replace(/[^0-9.]/g, ""))
        : null;
      return {
        externalId: `${city.toLowerCase().replace(/\s+/g, "_")}:${idVal}`,
        name: String(r[fieldMap.owner ?? ""] ?? `${city} permit holder`),
        address: r[fieldMap.addr ?? ""] ? String(r[fieldMap.addr ?? ""]) : null,
        zip: r[fieldMap.zip ?? ""] ? String(r[fieldMap.zip ?? ""]) : null,
        city,
        service_type: String(
          r[fieldMap.type ?? ""] ??
          (r[fieldMap.desc ?? ""] ? String(r[fieldMap.desc ?? ""]).slice(0, 60) : "Building permit"),
        ),
        estimated_cost: Number.isFinite(cost) ? cost : null,
        notes: String(r[fieldMap.desc ?? ""] ?? ""),
        raw: r,
      };
    }).filter((r) => r.externalId !== `${city.toLowerCase().replace(/\s+/g, "_")}:`);
  } catch {
    return [];
  }
}

// Placeholder for cities without a discovered public API yet.
async function fetchEmpty(_: number): Promise<PermitLead[]> {
  return [];
}

const SOURCES: CitySource[] = [
  // Massachusetts only — non-MA sources are disabled until expansion.
  { key: "boston_permits",     city: "Boston",     fetch: fetchBoston },
  { key: "cambridge_permits",  city: "Cambridge",  fetch: fetchCambridge },
  { key: "somerville_permits", city: "Somerville", fetch: fetchSomerville },
  { key: "lowell_permits",     city: "Lowell",     fetch: fetchLowell },
  { key: "quincy_permits",     city: "Quincy",     fetch: fetchEmpty },
  { key: "brockton_permits",   city: "Brockton",   fetch: fetchEmpty },
  { key: "springfield_permits",city: "Springfield",fetch: fetchEmpty },
  { key: "worcester_permits",  city: "Worcester",  fetch: fetchEmpty },
];

async function runOnce(opts: { source?: string; limit?: number; min_cost?: number }) {
  // Default 250/city/run × 29 cities × 5-min cadence is enough to catch
  // every new permit in major-metro datasets multiple times before they
  // age out. Bump higher if you see dupe ratios approaching 100%.
  const limit = opts.limit ?? 250;
  const minCost = opts.min_cost ?? 5000;
  const admin = createAdminClient();
  const results: Record<string, { fetched: number; inserted: number; duplicates: number; skipped_low_value: number; skipped_not_ma: number; skipped_quality: number; skipped_no_owner: number }> = {};

  const toRun = opts.source ? SOURCES.filter((s) => s.key === opts.source) : SOURCES;

  // Generic placeholder names that should never reach BatchData (waste
  // of credits — the quality gate will reject them anyway).
  const GENERIC_OWNER_RE = /^(?:[a-z]+ permit holder|[a-z]+ permittee|unknown|n\/?a)$/i;

  for (const src of toRun) {
    const rows = await src.fetch(limit).catch(() => [] as PermitLead[]);
    let inserted = 0, duplicates = 0, skippedLowValue = 0, skippedNotMA = 0, skippedQuality = 0, skippedNoOwner = 0;
    for (const r of rows) {
      if (r.estimated_cost != null && r.estimated_cost < minCost) { skippedLowValue++; continue; }
      if (!isMassachusettsLead({ city: r.city, zip: r.zip })) { skippedNotMA++; continue; }
      // Skip permits without a real owner name — saves BatchData credits.
      if (!r.name || GENERIC_OWNER_RE.test(r.name) || r.name.trim().length < 2) {
        skippedNoOwner++; continue;
      }
      // Also skip if no street address — BatchData needs it for accurate match.
      if (!r.address || r.address.trim().length < 5) {
        skippedNoOwner++; continue;
      }
      const { data: existing } = await admin
        .from("marketplace_leads").select("id")
        .eq("source_channel", "scraped").eq("external_id", r.externalId).maybeSingle();
      if (existing) { duplicates++; continue; }

      // Phone enrichment via configured provider. Tries name+address, then
      // falls back to address-only for higher match rate.
      const phone = await enrichPhone({
        name: r.name,
        address: r.address,
        city: r.city,
        zip: r.zip,
      });

      const notes = `${r.address ? `Address: ${r.address}\n` : ""}${r.notes}`;
      const quality = isQualifiedLead({
        name: r.name, phone, city: r.city, zip: r.zip, notes,
        service_type: r.service_type,
      });
      if (!quality.ok) { skippedQuality++; continue; }

      const { error } = await admin.from("marketplace_leads").insert({
        name: r.name,
        phone,
        service_type: r.service_type,
        notes,
        city: r.city,
        zip: r.zip,
        budget: classifyBudget(r.estimated_cost),
        timeline: "asap",
        ai_score: 60,
        ai_summary: r.service_type,
        price_cents: 1500,
        source_channel: "scraped",
        external_id: r.externalId,
        raw_payload: r.raw,
      });
      if (!error) inserted++;
    }
    await admin.from("scraper_runs").insert({
      source: src.key, region: src.city, fetched: rows.length, inserted, duplicates,
    });
    results[src.key] = { fetched: rows.length, inserted, duplicates, skipped_low_value: skippedLowValue, skipped_not_ma: skippedNotMA, skipped_quality: skippedQuality, skipped_no_owner: skippedNoOwner };
  }
  return results;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const result = await runOnce({
    source: url.searchParams.get("source") ?? undefined,
    limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
    min_cost: url.searchParams.get("min_cost") ? Number(url.searchParams.get("min_cost")) : undefined,
  });
  return NextResponse.json({ ok: true, results: result });
}

export async function POST(request: Request) {
  return GET(request);
}
