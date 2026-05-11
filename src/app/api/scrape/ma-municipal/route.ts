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

// Known feeds. Add more as towns expose them.
const CITY_FETCHERS: { key: string; city: string; fetch: Fetcher }[] = [
  {
    key: "newton_permits", city: "Newton",
    fetch: (limit) => fetchSocrataGeneric(
      `https://data.newtonma.gov/resource/x9j3-w8qg.json?$limit=${limit}`,
      "Newton",
      { id: "permit_number", type: "permit_type", desc: "description", cost: "estimated_cost", addr: "address", zip: "zip_code", owner: "applicant_name" },
    ),
  },
  {
    key: "framingham_permits", city: "Framingham",
    fetch: (limit) => fetchSocrataGeneric(
      `https://data.framinghamma.gov/resource/permits.json?$limit=${limit}`,
      "Framingham",
      { id: "permit_id", type: "type", desc: "description", cost: "cost", addr: "address", zip: "zip", owner: "owner" },
    ),
  },
  {
    key: "brookline_permits", city: "Brookline",
    fetch: (limit) => fetchSocrataGeneric(
      `https://data.brooklinema.gov/resource/permits.json?$limit=${limit}`,
      "Brookline",
      { id: "permit_id", type: "type", desc: "description", cost: "cost", addr: "address", zip: "zip", owner: "owner" },
    ),
  },
  {
    key: "arlington_permits", city: "Arlington",
    fetch: (limit) => fetchSocrataGeneric(
      `https://data.arlingtonma.gov/resource/permits.json?$limit=${limit}`,
      "Arlington",
      { id: "permit_id", type: "type", desc: "description", cost: "cost", addr: "address", zip: "zip", owner: "owner" },
    ),
  },
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
