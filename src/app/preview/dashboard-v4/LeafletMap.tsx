"use client";

import { useEffect, useRef } from "react";

export interface MapMarker {
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

interface Props {
  markers: MapMarker[];
  hqLat?: number | null;
  hqLng?: number | null;
  hqName?: string | null;
  height?: string;
}

const STAGE_COLORS: Record<string, string> = {
  new:           "#94A3B8",
  contacted:     "#3B82F6",
  estimate:      "#F59E0B",
  estimate_sent: "#F59E0B",
  quoted:        "#A78BFA",
  won:           "#10B981",
  lost:          "#F43F5E",
  scheduled:     "#3B82F6",
  in_progress:   "#F59E0B",
  completed:     "#10B981",
};

export default function LeafletMap({
  markers, hqLat, hqLng, hqName, height = "440px",
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<unknown>(null);

  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    let cancelled = false;
    let mapLocal: { remove: () => void } | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapRef.current) return;
      // Guard against React strict-mode double mounts.
      if (mapInstance.current) return;

      const fallbackCenter: [number, number] = [42.3601, -71.0589]; // Boston
      const center: [number, number] =
        hqLat && hqLng
          ? [hqLat, hqLng]
          : markers.length > 0
            ? [markers[0].lat, markers[0].lng]
            : fallbackCenter;

      const map = L.map(mapRef.current, {
        center,
        zoom: 10,
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      });
      mapInstance.current = map;
      mapLocal = map;

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        },
      ).addTo(map);

      if (hqLat && hqLng) {
        const hqIcon = L.divIcon({
          html: `<div style="width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#2563EB,#6366F1,#8B5CF6);box-shadow:0 10px 28px rgba(37,99,235,0.7),inset 0 1px 0 rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;color:white;font-family:Geist,sans-serif;font-weight:700;font-size:11px;letter-spacing:0.05em;">HQ</div>`,
          className: "cf-hq-icon",
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });
        L.marker([hqLat, hqLng], { icon: hqIcon, zIndexOffset: 1000 })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:Geist,sans-serif;min-width:140px;"><strong style="color:#0F172A;">HQ</strong><div style="color:#64748B;font-size:11px;margin-top:2px;">${hqName ?? "Your business"}</div></div>`,
          );
      }

      for (const m of markers) {
        const color = STAGE_COLORS[m.status ?? "new"] || "#94A3B8";
        const icon = L.divIcon({
          html: `<div style="position:relative;width:14px;height:14px;">
            <div style="position:absolute;left:50%;top:50%;width:30px;height:30px;border-radius:50%;background:radial-gradient(circle,${color}66,transparent 70%);transform:translate(-50%,-50%);animation:cfMapPing 2.6s ease-out infinite;"></div>
            <div style="position:relative;width:14px;height:14px;border-radius:50%;background:${color};box-shadow:0 0 0 2px rgba(15,23,42,0.95),0 0 12px ${color};"></div>
          </div>`,
          className: "cf-pin-icon",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
        });
        const popupHtml = `
          <div style="font-family:Geist,sans-serif;min-width:200px;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <strong style="color:#0F172A;font-size:13px;">${escapeHtml(m.name)}</strong>
              <span style="font-size:9px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:${color};background:${color}1f;padding:2px 6px;border-radius:4px;">${escapeHtml(m.kind)}</span>
            </div>
            <div style="font-size:11px;color:#64748B;margin-top:4px;line-height:1.5;">
              ${m.status ? `<div>Status · <strong style="color:#0F172A;">${escapeHtml(m.status)}</strong></div>` : ""}
              ${m.city ? `<div>${escapeHtml(m.city)}</div>` : ""}
              ${m.service_type ? `<div>${escapeHtml(m.service_type)}</div>` : ""}
              ${m.price ? `<div style="margin-top:4px;font-family:'Geist Mono',monospace;color:#0F172A;font-weight:600;">$${m.price.toLocaleString()}</div>` : ""}
            </div>
            <a href="/${m.kind === "customer" ? "customers" : m.kind === "job" ? "jobs" : "leads"}/${m.id}" style="display:inline-block;margin-top:8px;font-size:11px;color:#2563EB;font-weight:600;text-decoration:none;">Open →</a>
          </div>
        `;
        L.marker([m.lat, m.lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml);
      }

      // Auto-fit if multiple geo points
      const points: [number, number][] = markers.map((m) => [m.lat, m.lng]);
      if (hqLat && hqLng) points.push([hqLat, hqLng]);
      if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), {
          padding: [40, 40],
          maxZoom: 12,
        });
      }
    })();

    return () => {
      cancelled = true;
      if (mapLocal) {
        mapLocal.remove();
        mapInstance.current = null;
      } else if (mapInstance.current) {
        (mapInstance.current as { remove: () => void }).remove();
        mapInstance.current = null;
      }
    };
  }, [markers, hqLat, hqLng, hqName]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cfMapPing { 0% { transform: translate(-50%,-50%) scale(0.55); opacity: 0.95; } 80%, 100% { transform: translate(-50%,-50%) scale(2); opacity: 0; } }
        .leaflet-popup-content-wrapper { border-radius: 10px !important; box-shadow: 0 12px 36px -8px rgba(0,0,0,0.5) !important; }
        .leaflet-popup-content { margin: 12px 14px !important; }
        .leaflet-container { background: #0F172A !important; font-family: Geist, sans-serif; }
        .leaflet-control-attribution { background: rgba(15,23,42,0.7) !important; color: #94A3B8 !important; font-size: 10px !important; }
        .leaflet-control-attribution a { color: #3B82F6 !important; }
        .leaflet-bar a { background: rgba(15,23,42,0.85) !important; color: #fff !important; border: 1px solid rgba(255,255,255,0.1) !important; }
        .leaflet-bar a:hover { background: rgba(37,99,235,0.5) !important; }
      `}} />
      <div ref={mapRef} style={{ height, width: "100%" }} />
    </>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
