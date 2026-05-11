import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BudgetTier } from "@/lib/marketplace";

export const runtime = "nodejs";

// Public-records permit ingestion across major US cities. All sources below
// are Socrata- or ArcGIS-backed open data portals — public records, no auth,
// encouraged use. Budget tier is inferred from reported cost.

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET ?? process.env.WEBHOOK_SECRET;
  if (!expected) return true;
  const got = request.headers.get("authorization");
  if (got === `Bearer ${expected}`) return true;
  return request.headers.get("x-cron-secret") === expected;
}

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

const SOURCES: CitySource[] = [
  { key: "boston_permits",     city: "Boston",     fetch: fetchBoston },
  { key: "cambridge_permits",  city: "Cambridge",  fetch: fetchCambridge },
  { key: "somerville_permits", city: "Somerville", fetch: fetchSomerville },
  { key: "nyc_permits",        city: "New York",   fetch: fetchNyc },
  { key: "chicago_permits",    city: "Chicago",    fetch: fetchChicago },
];

async function runOnce(opts: { source?: string; limit?: number; min_cost?: number }) {
  const limit = opts.limit ?? 100;
  const minCost = opts.min_cost ?? 5000;
  const admin = createAdminClient();
  const results: Record<string, { fetched: number; inserted: number; duplicates: number; skipped_low_value: number }> = {};

  const toRun = opts.source ? SOURCES.filter((s) => s.key === opts.source) : SOURCES;

  for (const src of toRun) {
    const rows = await src.fetch(limit).catch(() => [] as PermitLead[]);
    let inserted = 0, duplicates = 0, skippedLowValue = 0;
    for (const r of rows) {
      if (r.estimated_cost != null && r.estimated_cost < minCost) { skippedLowValue++; continue; }
      const { data: existing } = await admin
        .from("marketplace_leads").select("id")
        .eq("source_channel", "scraped").eq("external_id", r.externalId).maybeSingle();
      if (existing) { duplicates++; continue; }
      const { error } = await admin.from("marketplace_leads").insert({
        name: r.name,
        service_type: r.service_type,
        notes: `${r.address ? `Address: ${r.address}\n` : ""}${r.notes}`,
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
    results[src.key] = { fetched: rows.length, inserted, duplicates, skipped_low_value: skippedLowValue };
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
