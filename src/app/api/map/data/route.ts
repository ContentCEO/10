import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Plan 1 / A-15 — Map data feed.
// Returns geocoded leads + jobs + customers for the current user as a single
// payload. Records without lat/lng are excluded (display the geocode-me CTA
// instead). The payload is small (~50 records max per kind) so client-side
// filtering is fine.

interface MapMarker {
  id: string;
  kind: "lead" | "job" | "customer";
  name: string;
  status: string | null;
  city: string | null;
  lat: number;
  lng: number;
  service_type: string | null;
  price: number | null;
}

interface PartialRecord {
  id: string;
  name?: string | null;
  status?: string | null;
  city?: string | null;
  lat: number;
  lng: number;
  service_type?: string | null;
  price?: number | null;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const [leads, jobs, customers] = await Promise.all([
    supabase.from("leads")
      .select("id,name,status,city,lat,lng,service_type")
      .eq("user_id", user.id)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(100),
    supabase.from("jobs")
      .select("id,title,status,city,lat,lng,price")
      .eq("user_id", user.id)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(100),
    supabase.from("customers")
      .select("id,name,city,lat,lng")
      .eq("user_id", user.id)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(100),
  ]);

  const markers: MapMarker[] = [];
  for (const r of (leads.data ?? []) as PartialRecord[]) {
    markers.push({ id: r.id, kind: "lead", name: r.name ?? "Lead", status: r.status ?? null, city: r.city ?? null, lat: r.lat, lng: r.lng, service_type: r.service_type ?? null, price: null });
  }
  for (const r of (jobs.data ?? []) as Array<PartialRecord & { title?: string | null }>) {
    markers.push({ id: r.id, kind: "job", name: r.title ?? "Job", status: r.status ?? null, city: r.city ?? null, lat: r.lat, lng: r.lng, service_type: null, price: r.price ?? null });
  }
  for (const r of (customers.data ?? []) as PartialRecord[]) {
    markers.push({ id: r.id, kind: "customer", name: r.name ?? "Customer", status: null, city: r.city ?? null, lat: r.lat, lng: r.lng, service_type: null, price: null });
  }

  return NextResponse.json({
    ok: true,
    counts: {
      leads:     leads.data?.length ?? 0,
      jobs:      jobs.data?.length ?? 0,
      customers: customers.data?.length ?? 0,
    },
    markers,
  });
}
