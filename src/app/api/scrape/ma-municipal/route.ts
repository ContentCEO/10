import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BudgetTier } from "@/lib/marketplace";

export const runtime = "nodejs";

// MA municipal Socrata feeds + similar open-data portals.
// Each town that publishes permits as JSON gets added here. We try the
// known feed shapes; town-by-town schemas vary.

import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

function classifyBudget(value: number | null): BudgetTier {
  if (value == null) return "unsure";
  if (value < 5_000)   return "under_5k";
  if (value < 15_000)  return "5k_15k";
  if (value < 50_000)  return "15k_50k";
  return "over_50k";
}

interface Lead {
  externalId: string;
  name: string;
  address: string | null;
  zip: string | null;
  city: string;
  service_type: string;
  estimated_cost: number | null;
  notes: string;
  raw: Record<string, unknown>;
}

type Fetcher = (limit: number) => Promise<Lead[]>;

// Generic Socrata wrapper that maps any common permit-row shape.
async function fetchSocrataGeneric(
  url: string,
  city: string,
  fieldMap: { id: string; type?: string; desc?: string; cost?: string; addr?: string; zip?: string; owner?: string },
): Promise<Lead[]> {
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
        externalId: `${city.toLowerCase()}:${idVal}`,
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
    }).filter((r) => r.externalId !== `${city.toLowerCase()}:`);
  } catch {
    return [];
  }
}

// ViewPoint Cloud is used by many MA towns for permitting. Each town has a
// subdomain like https://<town>.viewpointcloud.com/explore — the data lives
// at /api/v2/records (public, no auth). We try this for every MA town below.
async function fetchViewPoint(town: string, prettyName: string, limit: number): Promise<Lead[]> {
  const url = `https://${town}.viewpointcloud.com/api/v2/records?per_page=${limit}&sort=-applied_date&record_type=Permits`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json() as { data?: { id: string; attributes?: Record<string, unknown> }[] };
    return (data.data ?? []).map((row) => {
      const a = row.attributes ?? {};
      const cost = a.estimated_cost ? Number(String(a.estimated_cost).replace(/[^0-9.]/g, "")) : null;
      return {
        externalId: `${town}:${row.id}`,
        name: String(a.applicant_name ?? `${prettyName} permit holder`),
        address: a.address ? String(a.address) : null,
        zip: a.zip ? String(a.zip) : null,
        city: prettyName,
        service_type: String(a.record_type ?? a.description ?? "Building permit").slice(0, 60),
        estimated_cost: Number.isFinite(cost) ? cost : null,
        notes: String(a.description ?? ""),
        raw: a as Record<string, unknown>,
      };
    });
  } catch {
    return [];
  }
}

// Known feeds. Two kinds: Socrata-style direct + ViewPoint Cloud (used by ~half of MA).
const CITY_FETCHERS: { key: string; city: string; fetch: Fetcher }[] = [
  // Socrata-style
  { key: "newton_permits", city: "Newton",
    fetch: (l) => fetchSocrataGeneric(`https://data.newtonma.gov/resource/x9j3-w8qg.json?$limit=${l}`, "Newton",
      { id: "permit_number", type: "permit_type", desc: "description", cost: "estimated_cost", addr: "address", zip: "zip_code", owner: "applicant_name" }) },
  { key: "framingham_permits", city: "Framingham",
    fetch: (l) => fetchSocrataGeneric(`https://data.framinghamma.gov/resource/permits.json?$limit=${l}`, "Framingham",
      { id: "permit_id", type: "type", desc: "description", cost: "cost", addr: "address", zip: "zip", owner: "owner" }) },
  { key: "brookline_permits", city: "Brookline",
    fetch: (l) => fetchSocrataGeneric(`https://data.brooklinema.gov/resource/permits.json?$limit=${l}`, "Brookline",
      { id: "permit_id", type: "type", desc: "description", cost: "cost", addr: "address", zip: "zip", owner: "owner" }) },
  { key: "arlington_permits", city: "Arlington",
    fetch: (l) => fetchSocrataGeneric(`https://data.arlingtonma.gov/resource/permits.json?$limit=${l}`, "Arlington",
      { id: "permit_id", type: "type", desc: "description", cost: "cost", addr: "address", zip: "zip", owner: "owner" }) },

  // ViewPoint Cloud (subdomain pattern). These cover ~40 MA municipalities.
  { key: "worcester_permits",   city: "Worcester",      fetch: (l) => fetchViewPoint("worcester", "Worcester", l) },
  { key: "springfield_permits", city: "Springfield",    fetch: (l) => fetchViewPoint("springfield-ma", "Springfield", l) },
  { key: "quincy_permits",      city: "Quincy",         fetch: (l) => fetchViewPoint("quincy", "Quincy", l) },
  { key: "brockton_permits",    city: "Brockton",       fetch: (l) => fetchViewPoint("brockton", "Brockton", l) },
  { key: "lynn_permits",        city: "Lynn",           fetch: (l) => fetchViewPoint("lynn", "Lynn", l) },
  { key: "newbedford_permits",  city: "New Bedford",    fetch: (l) => fetchViewPoint("newbedford", "New Bedford", l) },
  { key: "fallriver_permits",   city: "Fall River",     fetch: (l) => fetchViewPoint("fallriver", "Fall River", l) },
  { key: "lawrence_permits",    city: "Lawrence",       fetch: (l) => fetchViewPoint("lawrence-ma", "Lawrence", l) },
  { key: "medford_permits",     city: "Medford",        fetch: (l) => fetchViewPoint("medford-ma", "Medford", l) },
  { key: "malden_permits",      city: "Malden",         fetch: (l) => fetchViewPoint("malden", "Malden", l) },
  { key: "plymouth_permits",    city: "Plymouth",       fetch: (l) => fetchViewPoint("plymouth", "Plymouth", l) },
  { key: "taunton_permits",     city: "Taunton",        fetch: (l) => fetchViewPoint("taunton", "Taunton", l) },
  { key: "chicopee_permits",    city: "Chicopee",       fetch: (l) => fetchViewPoint("chicopee", "Chicopee", l) },
  { key: "weymouth_permits",    city: "Weymouth",       fetch: (l) => fetchViewPoint("weymouth", "Weymouth", l) },
  { key: "revere_permits",      city: "Revere",         fetch: (l) => fetchViewPoint("revere", "Revere", l) },
  { key: "peabody_permits",     city: "Peabody",        fetch: (l) => fetchViewPoint("peabody", "Peabody", l) },
  { key: "methuen_permits",     city: "Methuen",        fetch: (l) => fetchViewPoint("methuen", "Methuen", l) },
  { key: "barnstable_permits",  city: "Barnstable",     fetch: (l) => fetchViewPoint("barnstable", "Barnstable", l) },
  { key: "pittsfield_permits",  city: "Pittsfield",     fetch: (l) => fetchViewPoint("pittsfield-ma", "Pittsfield", l) },
  { key: "attleboro_permits",   city: "Attleboro",      fetch: (l) => fetchViewPoint("attleboro", "Attleboro", l) },
  { key: "everett_permits",     city: "Everett",        fetch: (l) => fetchViewPoint("everett-ma", "Everett", l) },
  { key: "salem_permits",       city: "Salem",          fetch: (l) => fetchViewPoint("salem-ma", "Salem", l) },
  { key: "westfield_permits",   city: "Westfield",      fetch: (l) => fetchViewPoint("westfield-ma", "Westfield", l) },
  { key: "leominster_permits",  city: "Leominster",     fetch: (l) => fetchViewPoint("leominster", "Leominster", l) },
  { key: "fitchburg_permits",   city: "Fitchburg",      fetch: (l) => fetchViewPoint("fitchburg", "Fitchburg", l) },
  { key: "beverly_permits",     city: "Beverly",        fetch: (l) => fetchViewPoint("beverly-ma", "Beverly", l) },
  { key: "holyoke_permits",     city: "Holyoke",        fetch: (l) => fetchViewPoint("holyoke", "Holyoke", l) },
  { key: "waltham_permits",     city: "Waltham",        fetch: (l) => fetchViewPoint("waltham", "Waltham", l) },
  { key: "haverhill_permits",   city: "Haverhill",      fetch: (l) => fetchViewPoint("haverhill", "Haverhill", l) },
  { key: "watertown_permits",   city: "Watertown",      fetch: (l) => fetchViewPoint("watertown-ma", "Watertown", l) },
  { key: "dedham_permits",      city: "Dedham",         fetch: (l) => fetchViewPoint("dedham", "Dedham", l) },
  { key: "needham_permits",     city: "Needham",        fetch: (l) => fetchViewPoint("needham", "Needham", l) },
  { key: "wellesley_permits",   city: "Wellesley",      fetch: (l) => fetchViewPoint("wellesley", "Wellesley", l) },
  { key: "natick_permits",      city: "Natick",         fetch: (l) => fetchViewPoint("natick", "Natick", l) },
  { key: "concord_permits",     city: "Concord",        fetch: (l) => fetchViewPoint("concord-ma", "Concord", l) },
  { key: "lexington_permits",   city: "Lexington",      fetch: (l) => fetchViewPoint("lexington-ma", "Lexington", l) },
  { key: "winchester_permits",  city: "Winchester",     fetch: (l) => fetchViewPoint("winchester-ma", "Winchester", l) },
  { key: "andover_permits",     city: "Andover",        fetch: (l) => fetchViewPoint("andover", "Andover", l) },
  { key: "northandover_permits",city: "North Andover",  fetch: (l) => fetchViewPoint("northandover", "North Andover", l) },
  { key: "billerica_permits",   city: "Billerica",      fetch: (l) => fetchViewPoint("billerica", "Billerica", l) },
  { key: "burlington_permits",  city: "Burlington",     fetch: (l) => fetchViewPoint("burlington-ma", "Burlington", l) },
];

async function runOnce(opts: { limit?: number; min_cost?: number }) {
  const limit = opts.limit ?? 100;
  const minCost = opts.min_cost ?? 5000;
  const admin = createAdminClient();
  const results: Record<string, { fetched: number; inserted: number; duplicates: number; skipped_low_value: number }> = {};

  for (const src of CITY_FETCHERS) {
    const rows = await src.fetch(limit).catch(() => [] as Lead[]);
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
        city: r.city, zip: r.zip,
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
      source: src.key, region: src.city,
      fetched: rows.length, inserted, duplicates,
    });
    results[src.key] = { fetched: rows.length, inserted, duplicates, skipped_low_value: skippedLowValue };
  }
  return results;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const result = await runOnce({
    limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : undefined,
    min_cost: url.searchParams.get("min_cost") ? Number(url.searchParams.get("min_cost")) : undefined,
  });
  return NextResponse.json({ ok: true, results: result });
}

export async function POST(request: Request) { return GET(request); }
