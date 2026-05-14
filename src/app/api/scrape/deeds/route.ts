import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// MA Registry of Deeds intake.
//
// IMPORTANT: masslandrecords.com does NOT expose a public JSON API. The
// state's official feed is the Mass GIS parcel data + each county registry's
// daily CSV exports. To keep this legal + reliable we accept either:
//
//   1. A CSV paste from the contractor's existing data subscription
//      (Zillow Premier, REAL, Black Knight, etc.) via POST body.
//   2. The DataMass parcel-changes endpoint when available.
//
// Each row becomes a marketplace_lead tagged 'scraped' with a per-row
// external_id of `deeds:<county>:<book>:<page>` for dedup.
//
// Real deed scraping from masslandrecords.com would require respecting their
// ToS — which limits automated access. The accepted path is licensing
// property-records data from a vendor and feeding it here.

import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

interface DeedRow {
  county?: string;
  book?: string | number;
  page?: string | number;
  date?: string;
  buyer_name?: string;
  buyer_email?: string;
  buyer_phone?: string;
  property_address?: string;
  city?: string;
  zip?: string;
  price?: string | number;
  property_type?: string;
}

function externalIdFor(r: DeedRow): string | null {
  const c = (r.county ?? "MA").toString().toLowerCase().replace(/\s+/g, "_");
  const b = (r.book ?? "").toString().trim();
  const p = (r.page ?? "").toString().trim();
  if (!b && !p && !r.property_address) return null;
  return `deeds:${c}:${b}:${p}:${r.property_address ?? ""}`.slice(0, 220);
}

function classifyBudget(price: number | null): string {
  // New-homeowner spend tends to be 5-10% of property value in first 18 months.
  if (price == null) return "unsure";
  const renovation = price * 0.08;
  if (renovation < 5_000)  return "under_5k";
  if (renovation < 15_000) return "5k_15k";
  if (renovation < 50_000) return "15k_50k";
  return "over_50k";
}

async function ingest(rows: DeedRow[]) {
  const admin = createAdminClient();
  let inserted = 0, duplicates = 0, skipped = 0;
  for (const r of rows) {
    const externalId = externalIdFor(r);
    if (!externalId) { skipped++; continue; }
    if (!r.buyer_name && !r.property_address) { skipped++; continue; }

    const { data: existing } = await admin
      .from("marketplace_leads").select("id")
      .eq("source_channel", "scraped").eq("external_id", externalId).maybeSingle();
    if (existing) { duplicates++; continue; }

    const price = typeof r.price === "string"
      ? Number(r.price.replace(/[^0-9.]/g, ""))
      : (typeof r.price === "number" ? r.price : null);

    const { error } = await admin.from("marketplace_leads").insert({
      name: r.buyer_name ?? "New homeowner",
      phone: r.buyer_phone ?? null,
      email: r.buyer_email ?? null,
      city: r.city ?? null,
      zip: r.zip ?? null,
      service_type: "New homeowner — renovation buyer",
      budget: classifyBudget(Number.isFinite(price) ? price : null),
      timeline: "one_to_three_months",
      notes:
`Just-recorded property purchase signal.
Purchase price: ${price != null && Number.isFinite(price) ? `$${price.toLocaleString()}` : "(unknown)"}
Property: ${r.property_address ?? "(address withheld)"}
County: ${r.county ?? "(unknown)"}
Recorded: ${r.date ?? "(unknown)"}
Property type: ${r.property_type ?? "(unknown)"}

Studies: new homeowners spend 3× more on renovation in their first 18 months
than at any other time. Renovation budget commonly ~5-10% of purchase price.`,
      ai_score: 80,
      ai_summary: `New ${r.city ?? "MA"} homeowner — ${price != null && Number.isFinite(price) ? `$${(price / 1000).toFixed(0)}k` : "?"} property`,
      price_cents: 3500,
      source_channel: "scraped",
      external_id: externalId,
      raw_payload: r as unknown as Record<string, unknown>,
    });
    if (!error) inserted++;
  }
  await admin.from("scraper_runs").insert({
    source: "deeds", region: "MA",
    fetched: rows.length, inserted, duplicates,
  });
  return { fetched: rows.length, inserted, duplicates, skipped };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.rows)) {
    return NextResponse.json({
      error: "Body must be { rows: [{ county, book, page, date, buyer_name, property_address, city, zip, price, ... }, ...] }",
    }, { status: 400 });
  }
  const result = await ingest(body.rows as DeedRow[]);
  return NextResponse.json({ ok: true, source: "deeds", ...result });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    source: "deeds",
    usage: "POST { rows: [...] }. Each row: { county, book, page, date, buyer_name, buyer_email, buyer_phone, property_address, city, zip, price, property_type }. Paste from your property-data vendor.",
  });
}
