import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Bulk geocode every lead/job/customer that has address fields but no lat/lng.
// Hits Nominatim with a courteous 1.1s delay between requests (their hard
// limit is 1 req/sec). Caps at 30 records per invocation so we stay well
// under Vercel's 60s timeout — re-invoke until counts.remaining == 0.

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

interface Row {
  id: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Fetch ungeocoded rows from each table.
  const [leads, jobs, customers] = await Promise.all([
    supabase.from("leads")
      .select("id,address,city,state,zip")
      .eq("user_id", user.id)
      .is("lat", null)
      .limit(PER_RUN),
    supabase.from("jobs")
      .select("id,address,city,state,zip")
      .eq("user_id", user.id)
      .is("lat", null)
      .limit(PER_RUN),
    supabase.from("customers")
      .select("id,address,city,state,zip")
      .eq("user_id", user.id)
      .is("lat", null)
      .limit(PER_RUN),
  ]);

  type Job = { table: "leads" | "jobs" | "customers"; row: Row };
  const queue: Job[] = [
    ...((leads.data ?? []) as Row[]).map((r) => ({ table: "leads"     as const, row: r })),
    ...((jobs.data  ?? []) as Row[]).map((r) => ({ table: "jobs"      as const, row: r })),
    ...((customers.data ?? []) as Row[]).map((r) => ({ table: "customers" as const, row: r })),
  ].slice(0, PER_RUN);

  let geocoded = 0;
  let skippedNoAddress = 0;
  let failed = 0;

  for (const { table, row } of queue) {
    const query = [row.address, row.city, row.state, row.zip].filter(Boolean).join(", ");
    if (!query) { skippedNoAddress++; continue; }
    const result = await geocode(query);
    if (!result) { failed++; await sleep(SLEEP_MS); continue; }
    await supabase.from(table).update({ lat: result.lat, lng: result.lng }).eq("id", row.id);
    geocoded++;
    await sleep(SLEEP_MS);
  }

  // Count remaining work so the client can keep calling.
  const [remLead, remJob, remCust] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).is("lat", null),
    supabase.from("jobs").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).is("lat", null),
    supabase.from("customers").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).is("lat", null),
  ]);

  return NextResponse.json({
    ok: true,
    processed: queue.length,
    geocoded,
    skipped_no_address: skippedNoAddress,
    failed,
    remaining: {
      leads:     remLead.count     ?? 0,
      jobs:      remJob.count      ?? 0,
      customers: remCust.count     ?? 0,
    },
  });
}
