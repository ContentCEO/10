import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Daily route planner. Pulls today's scheduled jobs that have lat/lng,
// orders them by nearest-neighbor starting from HQ (or first job if no
// HQ coords), returns the optimized sequence + total drive distance.
//
// Not a true TSP solver — nearest-neighbor is ~25% from optimal but
// runs in O(n²) which is fine for ≤20 jobs per day.

interface JobRow {
  id: string;
  title: string;
  start_date: string | null;
  status: string;
  lat: number | null;
  lng: number | null;
  customer_id: string | null;
}

interface JobWithCoords {
  id: string;
  title: string;
  start_date: string | null;
  lat: number;
  lng: number;
}

function haversineMiles(a: [number, number], b: [number, number]): number {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;
  const R = 3958.8; // miles
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const target = dateParam ? new Date(dateParam) : new Date();
  const dayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).toISOString();
  const dayEnd   = new Date(target.getFullYear(), target.getMonth(), target.getDate() + 1).toISOString();

  const [{ data: jobs }, { data: profile }] = await Promise.all([
    supabase.from("jobs")
      .select("id,title,start_date,status,lat,lng,customer_id")
      .eq("user_id", user.id)
      .in("status", ["scheduled", "in_progress"])
      .gte("start_date", dayStart)
      .lt("start_date", dayEnd)
      .order("start_date"),
    supabase.from("profiles").select("lat,lng,business_name").eq("id", user.id).maybeSingle(),
  ]);

  const allJobs = (jobs ?? []) as JobRow[];
  const geocoded: JobWithCoords[] = allJobs
    .filter((j): j is JobRow & { lat: number; lng: number } => j.lat != null && j.lng != null)
    .map((j) => ({ id: j.id, title: j.title, start_date: j.start_date, lat: j.lat, lng: j.lng }));
  const ungeocoded = allJobs.length - geocoded.length;

  const prof = profile as { lat: number | null; lng: number | null; business_name: string | null } | null;
  const hq: [number, number] | null =
    prof?.lat != null && prof?.lng != null ? [prof.lat, prof.lng] : null;

  // Nearest-neighbor ordering.
  const ordered: Array<JobWithCoords & { drive_from_prev_mi: number }> = [];
  const remaining = [...geocoded];
  let current: [number, number] | null = hq;

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestDist = Infinity;
    if (current) {
      for (let i = 0; i < remaining.length; i++) {
        const d = haversineMiles(current, [remaining[i].lat, remaining[i].lng]);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
    } else {
      // No HQ — pick the first by start_date (already sorted).
      bestIdx = 0;
      bestDist = 0;
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push({ ...next, drive_from_prev_mi: Math.round(bestDist * 10) / 10 });
    current = [next.lat, next.lng];
  }

  const totalMiles = ordered.reduce((s, j) => s + j.drive_from_prev_mi, 0);

  return NextResponse.json({
    ok: true,
    date: target.toISOString().slice(0, 10),
    hq: hq ? { lat: hq[0], lng: hq[1], name: prof?.business_name ?? "HQ" } : null,
    ordered,
    ungeocoded_count: ungeocoded,
    total_drive_miles: Math.round(totalMiles * 10) / 10,
    estimated_drive_minutes: Math.round((totalMiles / 30) * 60), // 30mph average urban
  });
}
