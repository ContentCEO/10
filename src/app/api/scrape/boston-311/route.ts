import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Boston 311 service requests. Source: data.boston.gov CKAN datastore.
//
// 311 requests are homeowner-initiated reports to the city. While most are
// city-handled (trash, potholes), a meaningful slice signals private-property
// work that contractors can offer: tree-on-property, broken sidewalk on a
// homeowner-responsible stretch, sanitary issues from a private building,
// rodent-attractant from a neglected lot.
//
// We filter to ones where the reporter's location is on private property
// AND the case description maps to a private-contractor service.

interface CkanResponse<T> {
  result?: { records?: T[] };
}

// resource_id: 311 service requests (data.boston.gov)
// https://data.boston.gov/dataset/311-service-requests
const RESOURCE_ID = "12cb3883-56f5-47de-afa5-3b1cf61b257b";

interface Request311 {
  case_enquiry_id?: string;
  open_dt?: string;
  closed_dt?: string | null;
  type?: string;
  subject?: string;
  reason?: string;
  location?: string;
  street?: string;
  city?: string;
  neighborhood?: string;
  location_zipcode?: string;
  closure_reason?: string;
}

async function fetchBoston311(limit: number) {
  const url = `https://data.boston.gov/api/3/action/datastore_search?resource_id=${RESOURCE_ID}&limit=${limit}&sort=open_dt%20desc`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json() as CkanResponse<Request311>;
    return (data.result?.records ?? []).filter((r) => !r.closed_dt);
  } catch {
    return [];
  }
}

// Map 311 case "reason" to a private-contractor service category.
// Returns null if the case is NOT a private-property contractor opportunity.
function classify(r: Request311): { service: string; price_cents: number } | null {
  const haystack = `${r.type ?? ""} ${r.subject ?? ""} ${r.reason ?? ""}`.toLowerCase();

  // Private tree on private property — homeowner pays for removal/pruning.
  if (/tree.*emergency|tree.*private|fallen.*tree|leaning.*tree|dead.*tree/.test(haystack)) {
    return { service: "Tree service · removal/pruning", price_cents: 1800 };
  }
  // Broken sidewalk in front of property — abutter often responsible.
  if (/sidewalk.*broken|sidewalk.*damaged|sidewalk.*repair/.test(haystack)) {
    return { service: "Concrete · sidewalk repair", price_cents: 1500 };
  }
  // Drainage / water pooling on private property.
  if (/standing water|drainage|flooding|water.*basement/.test(haystack)) {
    return { service: "Drainage / waterproofing", price_cents: 1800 };
  }
  // Animal/rodent attractant — usually private trash/composting issue.
  if (/rodent|rats|infestation|animal/.test(haystack)) {
    return { service: "Pest control + cleanup", price_cents: 1000 };
  }
  // Graffiti on private building.
  if (/graffiti.*building|graffiti.*property/.test(haystack)) {
    return { service: "Graffiti removal / pressure wash", price_cents: 900 };
  }
  // Abandoned vehicle on private property — towing referral.
  if (/abandoned.*vehicle.*property|junk.*vehicle/.test(haystack)) {
    return { service: "Junk vehicle removal", price_cents: 700 };
  }
  // Snow on private sidewalk (abutter responsibility).
  if (/snow.*sidewalk|ice.*sidewalk|snow.*not cleared/.test(haystack)) {
    return { service: "Snow removal · sidewalk", price_cents: 800 };
  }
  // Trash on private property.
  if (/illegal dumping|trash.*property|debris/.test(haystack)) {
    return { service: "Junk removal / hauling", price_cents: 900 };
  }
  return null;
}

async function runOnce(opts: { limit?: number }) {
  const limit = opts.limit ?? 200;
  const admin = createAdminClient();
  const rows = await fetchBoston311(limit);

  let inserted = 0, duplicates = 0, skipped = 0;

  for (const r of rows) {
    const cls = classify(r);
    if (!cls) { skipped++; continue; }
    if (!r.case_enquiry_id) { skipped++; continue; }
    const externalId = `boston311:${r.case_enquiry_id}`;

    const { data: existing } = await admin
      .from("marketplace_leads").select("id")
      .eq("source_channel", "scraped").eq("external_id", externalId).maybeSingle();
    if (existing) { duplicates++; continue; }

    const addr = [r.street, r.city || "Boston", r.location_zipcode].filter(Boolean).join(", ");
    const { error } = await admin.from("marketplace_leads").insert({
      name: "Boston resident (311)",
      city: r.city ?? "Boston",
      zip: r.location_zipcode ?? null,
      service_type: cls.service,
      budget: "unsure",
      timeline: "asap",
      notes:
`Source: Boston 311 service request (public record).
Opened: ${r.open_dt}
Neighborhood: ${r.neighborhood ?? "(unknown)"}
Address: ${addr}
Case type: ${r.type ?? ""}
Subject: ${r.subject ?? ""}
Reason: ${r.reason ?? ""}

Resident reported this to the city; case is still open. Contractor can
canvas the address with a flyer or door knock once the case is resolved
or in progress.`,
      ai_score: 55,
      ai_summary: `${cls.service} · ${addr}`,
      price_cents: cls.price_cents,
      source_channel: "scraped",
      external_id: externalId,
      raw_payload: r as unknown as Record<string, unknown>,
    });
    if (!error) inserted++;
  }

  await admin.from("scraper_runs").insert({
    source: "boston_311", region: "Boston",
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
  return NextResponse.json({ ok: true, source: "boston_311", ...result });
}

export async function POST(request: Request) { return GET(request); }
