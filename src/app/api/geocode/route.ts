import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Plan 1 / A-15 — Geocoding endpoint for the map view.
//
// POST /api/geocode { kind: "lead"|"job"|"customer", id: uuid }
// Looks up the record's address fields, geocodes via Nominatim (free,
// 1 req/sec hard limit), persists lat/lng. Idempotent — skips if already
// geocoded.

interface Body { kind?: "lead" | "job" | "customer"; id?: string }

interface NominatimRow { lat: string; lon: string; display_name: string }

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      {
        headers: {
          // Nominatim requires a User-Agent identifying the app.
          "User-Agent": "ContractorFlow/1.0 (geocoding for contractor map view)",
        },
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

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.kind || !body?.id) {
    return NextResponse.json({ error: "kind + id required" }, { status: 400 });
  }
  const table = body.kind === "lead" ? "leads"
              : body.kind === "job"  ? "jobs"
              : "customers";

  const { data: row } = await supabase.from(table)
    .select("id,lat,lng,address,city,zip,state")
    .eq("id", body.id).eq("user_id", user.id).single();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const r = row as { id: string; lat: number | null; lng: number | null; address?: string | null; city?: string | null; zip?: string | null; state?: string | null };
  if (r.lat != null && r.lng != null) {
    return NextResponse.json({ ok: true, lat: r.lat, lng: r.lng, cached: true });
  }

  const query = [r.address, r.city, r.state, r.zip].filter(Boolean).join(", ");
  if (!query) return NextResponse.json({ error: "Record has no address fields" }, { status: 400 });

  const result = await geocode(query);
  if (!result) return NextResponse.json({ error: "Geocoding failed for query" }, { status: 502 });

  await supabase.from(table).update({ lat: result.lat, lng: result.lng }).eq("id", body.id);
  return NextResponse.json({ ok: true, lat: result.lat, lng: result.lng, cached: false });
}
