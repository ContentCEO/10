"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Clock, Compass, Loader2, Navigation, Route } from "lucide-react";
import type { MapMarker } from "@/app/(app)/dashboard/LeafletMap";

const LeafletMap = dynamic(() => import("@/app/(app)/dashboard/LeafletMap"), { ssr: false });

interface OrderedJob {
  id: string;
  title: string;
  start_date: string | null;
  lat: number;
  lng: number;
  drive_from_prev_mi: number;
}
interface RoutePlan {
  ok: boolean;
  date: string;
  hq: { lat: number; lng: number; name: string } | null;
  ordered: OrderedJob[];
  ungeocoded_count: number;
  total_drive_miles: number;
  estimated_drive_minutes: number;
}

export function RoutePlanClient() {
  const [plan, setPlan] = useState<RoutePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/route-plan")
      .then((r) => r.json())
      .then((j: RoutePlan & { error?: string }) => {
        if (!j.ok) { setError(j.error ?? "Failed to load route"); setLoading(false); return; }
        setPlan(j);
        setLoading(false);
      })
      .catch(() => { setError("Network error"); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="card p-10 text-center text-ink-400">
        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
      </div>
    );
  }
  if (error) {
    return <div className="card p-6 text-sm text-rose-600">{error}</div>;
  }
  if (!plan || plan.ordered.length === 0) {
    return (
      <div className="card p-10 text-center">
        <Compass className="h-10 w-10 mx-auto text-ink-300 mb-3" />
        <h2 className="font-semibold mb-1">No scheduled jobs with locations today</h2>
        <p className="text-sm text-ink-500 max-w-md mx-auto">
          {plan?.ungeocoded_count
            ? `${plan.ungeocoded_count} job${plan.ungeocoded_count === 1 ? "" : "s"} today, but no geocoded customer addresses. Geocode customers from the dashboard map.`
            : "Schedule jobs with linked customers (who have geocoded addresses) and they'll show up here."}
        </p>
      </div>
    );
  }

  const markers: MapMarker[] = plan.ordered.map((j, i) => ({
    id: j.id,
    kind: "job",
    name: `${i + 1}. ${j.title}`,
    status: "scheduled",
    city: null,
    lat: j.lat,
    lng: j.lng,
    service_type: null,
    price: null,
  }));

  return (
    <>
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Stops" value={String(plan.ordered.length)} />
        <Stat label="Drive miles" value={plan.total_drive_miles.toFixed(1)} />
        <Stat label="Drive time"
          value={plan.estimated_drive_minutes >= 60
            ? `${Math.floor(plan.estimated_drive_minutes / 60)}h ${plan.estimated_drive_minutes % 60}m`
            : `${plan.estimated_drive_minutes}m`} />
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between border-b border-ink-200/70">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-brand-600" />
            <h2 className="font-semibold">Map</h2>
          </div>
          {plan.ungeocoded_count > 0 && (
            <span className="text-[11px] text-ink-500 italic">
              {plan.ungeocoded_count} job{plan.ungeocoded_count === 1 ? "" : "s"} skipped (no coords)
            </span>
          )}
        </div>
        <LeafletMap
          markers={markers}
          hqLat={plan.hq?.lat ?? null}
          hqLng={plan.hq?.lng ?? null}
          hqName={plan.hq?.name ?? null}
          height="400px"
        />
      </section>

      <section className="card p-5">
        <h2 className="font-semibold mb-3">Suggested order</h2>
        <ol className="space-y-2">
          {plan.ordered.map((j, i) => (
            <li key={j.id}>
              <Link href={`/jobs/${j.id}`}
                className="flex items-start gap-3 p-2.5 rounded-lg transition-colors hover:bg-ink-50">
                <span className="w-7 h-7 rounded-full bg-brand-gradient text-white text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-900 truncate">{j.title}</div>
                  {j.start_date && (
                    <div className="text-[11px] text-ink-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(j.start_date).toLocaleTimeString("en-US", {
                        hour: "numeric", minute: "2-digit", hour12: true,
                      })}
                    </div>
                  )}
                </div>
                <span className="text-xs text-ink-500 tabular-nums font-mono shrink-0 inline-flex items-center gap-1">
                  <Navigation className="h-3 w-3" />
                  {j.drive_from_prev_mi.toFixed(1)}mi
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </>
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

