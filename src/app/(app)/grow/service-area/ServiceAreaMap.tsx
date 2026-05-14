"use client";

import dynamic from "next/dynamic";
import type { MapMarker } from "@/app/(app)/dashboard/LeafletMap";

const LeafletMap = dynamic(() => import("@/app/(app)/dashboard/LeafletMap"), { ssr: false });

interface Point {
  lat: number;
  lng: number;
  label: string;
  kind: "lead" | "job" | "customer";
  status?: string;
  price?: number | null;
}

export function ServiceAreaMap({ points }: { points: Point[] }) {
  const markers: MapMarker[] = points.map((p, i) => ({
    id: `${p.kind}-${i}`,
    kind: p.kind,
    name: p.label,
    status: p.status ?? null,
    city: null,
    lat: p.lat,
    lng: p.lng,
    service_type: null,
    price: p.price ?? null,
  }));

  return <LeafletMap markers={markers} hqLat={null} hqLng={null} hqName={null} height="520px" />;
}
