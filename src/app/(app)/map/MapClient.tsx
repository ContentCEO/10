"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { MapMarker } from "@/app/(app)/dashboard/LeafletMap";

const LeafletMap = dynamic(() => import("@/app/(app)/dashboard/LeafletMap"), { ssr: false });

interface Point {
  id: string;
  kind: "lead" | "job" | "customer";
  name: string;
  lat: number;
  lng: number;
  status: string | null;
  price: number | null;
  service_type: string | null;
}

export function MapClient({ points }: { points: Point[] }) {
  const router = useRouter();

  // Esc closes back to dashboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") router.push("/dashboard");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const markers: MapMarker[] = points.map((p) => ({
    id: p.id,
    kind: p.kind,
    name: p.name,
    status: p.status,
    city: null,
    lat: p.lat,
    lng: p.lng,
    service_type: p.service_type,
    price: p.price,
  }));

  return <LeafletMap markers={markers} hqLat={null} hqLng={null} hqName={null} height="100%" />;
}
