import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MapClient } from "./MapClient";

export const dynamic = "force-dynamic";

export default async function FullMapPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: leadGeo }, { data: jobGeo }, { data: customerGeo }] = await Promise.all([
    supabase.from("leads").select("id,name,status,service_type,price,lat,lng")
      .eq("user_id", user.id).not("lat", "is", null).not("lng", "is", null).limit(500),
    supabase.from("jobs").select("id,title,status,price,lat,lng")
      .eq("user_id", user.id).not("lat", "is", null).not("lng", "is", null).limit(500),
    supabase.from("customers").select("id,name,lat,lng")
      .eq("user_id", user.id).not("lat", "is", null).not("lng", "is", null).limit(500),
  ]);

  const points = [
    ...((leadGeo ?? []) as Array<{ id: string; name: string; status: string | null; service_type: string | null; price: number | null; lat: number; lng: number }>)
      .map((l) => ({ id: l.id, kind: "lead" as const, name: l.name, lat: l.lat, lng: l.lng, status: l.status, price: l.price, service_type: l.service_type })),
    ...((jobGeo ?? []) as Array<{ id: string; title: string; status: string | null; price: number | null; lat: number; lng: number }>)
      .map((j) => ({ id: j.id, kind: "job" as const, name: j.title, lat: j.lat, lng: j.lng, status: j.status, price: j.price, service_type: null })),
    ...((customerGeo ?? []) as Array<{ id: string; name: string; lat: number; lng: number }>)
      .map((c) => ({ id: c.id, kind: "customer" as const, name: c.name, lat: c.lat, lng: c.lng, status: null, price: null, service_type: null })),
  ];

  const counts = {
    leads:     points.filter((p) => p.kind === "lead").length,
    jobs:      points.filter((p) => p.kind === "job").length,
    customers: points.filter((p) => p.kind === "customer").length,
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-50">
      <header className="bg-white/95 backdrop-blur border-b border-ink-200/70 px-4 py-3 flex items-center gap-4 shrink-0">
        <Link href="/dashboard" className="text-ink-500 hover:text-brand-600 inline-flex items-center gap-1 text-sm">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="flex items-center gap-2 flex-1">
          <MapPin className="h-4 w-4 text-brand-600" />
          <h1 className="text-base font-semibold tracking-tight" style={{ fontFamily: "var(--font-geist-sans)" }}>
            Map
          </h1>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs font-mono tabular-nums text-ink-600">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {counts.leads} leads
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {counts.jobs} jobs
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            {counts.customers} customers
          </span>
        </div>
        <kbd className="hidden md:inline-flex text-[10px] text-ink-500 font-mono bg-ink-100 ring-1 ring-ink-200 rounded px-1.5 py-0.5">esc</kbd>
      </header>
      <div className="flex-1 min-h-0">
        <MapClient points={points} />
      </div>
    </div>
  );
}
