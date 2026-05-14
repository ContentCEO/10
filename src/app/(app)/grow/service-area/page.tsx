import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ServiceAreaMap } from "./ServiceAreaMap";

export const dynamic = "force-dynamic";

export default async function ServiceAreaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: leadGeo }, { data: jobGeo }, { data: customerGeo }] = await Promise.all([
    supabase.from("leads").select("id,name,lat,lng,status,service_type,price")
      .eq("user_id", user.id).not("lat", "is", null).not("lng", "is", null).limit(500),
    supabase.from("jobs").select("id,title,lat,lng,status,price")
      .eq("user_id", user.id).not("lat", "is", null).not("lng", "is", null).limit(500),
    supabase.from("customers").select("id,name,lat,lng")
      .eq("user_id", user.id).not("lat", "is", null).not("lng", "is", null).limit(500),
  ]);

  const points: { lat: number; lng: number; label: string; kind: "lead" | "job" | "customer"; status?: string; price?: number | null }[] = [
    ...((leadGeo ?? []) as { id: string; name: string; lat: number; lng: number; status: string; service_type: string | null; price: number | null }[])
      .map((l) => ({ lat: l.lat, lng: l.lng, label: l.name, kind: "lead" as const, status: l.status, price: l.price })),
    ...((jobGeo ?? []) as { id: string; title: string; lat: number; lng: number; status: string; price: number | null }[])
      .map((j) => ({ lat: j.lat, lng: j.lng, label: j.title, kind: "job" as const, status: j.status, price: j.price })),
    ...((customerGeo ?? []) as { id: string; name: string; lat: number; lng: number }[])
      .map((c) => ({ lat: c.lat, lng: c.lng, label: c.name, kind: "customer" as const })),
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><MapPin className="h-3.5 w-3.5" /> Growth · Service Area</span>
          <h1 className="mt-2 display-h2">
            Where your work <em>lives</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Every geocoded lead, job, and customer plotted on a real map.
            Dense pockets show where you have density — and where to
            advertise more.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Leads" value={String(points.filter((p) => p.kind === "lead").length)} />
        <Stat label="Jobs" value={String(points.filter((p) => p.kind === "job").length)} />
        <Stat label="Customers" value={String(points.filter((p) => p.kind === "customer").length)} />
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Service area map</h2>
        </div>
        {points.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-ink-500" style={{ background: "#0F172A", color: "#CBD5E1" }}>
            No geocoded records yet. Click &quot;Geocode my customers&quot; on the
            dashboard map to populate this.
          </div>
        ) : (
          <ServiceAreaMap points={points} />
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="mt-1 text-3xl tabular-nums font-mono text-ink-900">{value}</div>
    </div>
  );
}
