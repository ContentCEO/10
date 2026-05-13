import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Bulk geocode customers that have an address but no lat/lng.
// (Schema: only `customers` has address fields. Leads/jobs inherit
// the customer's lat/lng when they're linked via customer_id.)
//
// Hits Nominatim with a courteous 1.1s delay between requests (their
// hard limit is 1 req/sec). Processes up to 30 records per invocation
// to stay well under Vercel's 60s timeout — re-invoke until
// remaining == 0.

interface NominatimRow { lat: string; lon: string }

const PER_RUN = 30;
const SLEEP_MS = 1100;

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      {
        headers: { "User-Agent": "ContractorFlow/1.0 (geocoding backfill)" },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimRow[];
    const first = data[0];
    if (!first) return null;
    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
  } catch { return null; }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface CustomerRow {
  id: string;
  address: string | null;
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: rows } = await supabase
    .from("customers")
    .select("id,address")
    .eq("user_id", user.id)
    .is("lat", null)
    .not("address", "is", null)
    .limit(PER_RUN);

  const queue = (rows ?? []) as CustomerRow[];

  let geocoded = 0;
  let failed = 0;

  for (const row of queue) {
    if (!row.address) continue;
    const result = await geocode(row.address);
    if (!result) { failed++; await sleep(SLEEP_MS); continue; }
    await supabase.from("customers")
      .update({ lat: result.lat, lng: result.lng })
      .eq("id", row.id);
    geocoded++;
    await sleep(SLEEP_MS);
  }

  // After updating customers, cascade lat/lng to any linked leads/jobs.
  if (geocoded > 0) {
    const updatedIds = queue.map((r) => r.id);
    // Pull the freshly-geocoded customer rows.
    const { data: freshCustomers } = await supabase
      .from("customers")
      .select("id,lat,lng")
      .in("id", updatedIds)
      .not("lat", "is", null);
    for (const c of (freshCustomers ?? []) as { id: string; lat: number; lng: number }[]) {
      await Promise.all([
        supabase.from("leads").update({ lat: c.lat, lng: c.lng })
          .eq("customer_id", c.id).eq("user_id", user.id),
        supabase.from("jobs").update({ lat: c.lat, lng: c.lng })
          .eq("customer_id", c.id).eq("user_id", user.id),
      ]);
    }
  }

  const { count: remaining } = await supabase
    .from("customers").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).is("lat", null).not("address", "is", null);

  const { count: noAddress } = await supabase
    .from("customers").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).is("address", null);

  return NextResponse.json({
    ok: true,
    processed: queue.length,
    geocoded,
    failed,
    remaining: remaining ?? 0,
    no_address: noAddress ?? 0,
  });
}
