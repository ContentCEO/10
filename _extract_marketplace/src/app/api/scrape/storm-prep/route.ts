import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Plan 1 / C-19 — Storm-prep mode.
//
// When NWS issues a severe-weather WATCH (i.e., conditions favorable but
// not happening yet — typically 12-48 hours out), pre-position lead-gen by
// creating "storm prep" opportunity rows tagged to the affected counties.
// These surface to contractors who handle roofing, tree, gutters, generators
// before the storm hits.
//
// This is meaningfully different from the existing /api/scrape/storms which
// pulls ACTIVE alerts (storm already happening). Storm-prep targets WATCHES.

interface Alert {
  id: string;
  properties: {
    event?: string;
    severity?: string;
    headline?: string;
    description?: string;
    onset?: string;
    expires?: string;
    areaDesc?: string;
    geocode?: { SAME?: string[] };
  };
}
interface AlertsResponse { features?: Alert[] }

const PREP_EVENTS = [
  "Tornado Watch", "Severe Thunderstorm Watch", "Hurricane Watch",
  "Tropical Storm Watch", "High Wind Watch", "Hail Watch",
  "Winter Storm Watch", "Blizzard Watch",
];

function serviceFromEvent(event: string): { service: string; price_cents: number } {
  const e = event.toLowerCase();
  if (/tornado|hurricane|tropical/.test(e)) return { service: "Storm prep · tree + gutter clearance + tarps", price_cents: 1500 };
  if (/thunderstorm|hail/.test(e))          return { service: "Storm prep · roof inspection + drainage", price_cents: 1200 };
  if (/high wind/.test(e))                   return { service: "Storm prep · loose-shingle inspection + tree trim", price_cents: 1200 };
  if (/winter|blizzard|snow/.test(e))        return { service: "Storm prep · roof load + ice dam mitigation", price_cents: 1400 };
  return { service: "Storm prep · pre-storm property check", price_cents: 1000 };
}

async function runOnce(states: string[]) {
  const admin = createAdminClient();
  let inserted = 0, duplicates = 0, totalFetched = 0;

  for (const state of states) {
    const url = `https://api.weather.gov/alerts/active?area=${state}&status=actual&severity=Moderate,Severe,Extreme`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "ContractorFlow/3.0 (storm-prep lead engine)", Accept: "application/geo+json" },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = await res.json() as AlertsResponse;
      for (const a of data.features ?? []) {
        const ev = a.properties.event ?? "";
        if (!PREP_EVENTS.some((p) => ev.includes(p))) continue;
        totalFetched++;
        const externalId = `storm_prep:${a.id}`;

        const { data: existing } = await admin
          .from("marketplace_leads").select("id")
          .eq("source_channel", "scraped").eq("external_id", externalId).maybeSingle();
        if (existing) { duplicates++; continue; }

        const { service, price_cents } = serviceFromEvent(ev);
        const { error } = await admin.from("marketplace_leads").insert({
          name: `Storm prep · ${state}`,
          city: a.properties.areaDesc?.split(",")[0]?.slice(0, 80) ?? state,
          service_type: service,
          budget: "5k_15k",
          timeline: "asap",
          notes:
`Source: NWS storm-prep WATCH (pre-storm, lead time of hours to days).
Event: ${ev}
Severity: ${a.properties.severity ?? "?"}
Headline: ${a.properties.headline ?? ""}
Onset: ${a.properties.onset ?? "?"} · Expires: ${a.properties.expires ?? "?"}
Area: ${a.properties.areaDesc ?? ""}

Use case: contact homeowners NOW to schedule preventive inspections,
gutter cleanings, tree trimming, generator hookups. Higher-margin urgency window.`,
          ai_score: 65,
          ai_summary: `${service} · ${state}`,
          price_cents,
          source_channel: "scraped",
          external_id: externalId,
          raw_payload: a as unknown as Record<string, unknown>,
        });
        if (!error) inserted++;
      }
    } catch { /* try next state */ }
  }

  await admin.from("scraper_runs").insert({
    source: "storm_prep", region: states.join(","),
    fetched: totalFetched, inserted, duplicates,
  });
  return { fetched: totalFetched, inserted, duplicates };
}

const DEFAULT_STATES = ["MA", "RI", "NH", "CT", "VT", "ME", "NY"];

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const states = url.searchParams.get("states")?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) ?? DEFAULT_STATES;
  const result = await runOnce(states);
  return NextResponse.json({ ok: true, source: "storm_prep", states, ...result });
}

export async function POST(request: Request) { return GET(request); }
