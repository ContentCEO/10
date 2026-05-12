import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// NOAA Storm Events — recent severe weather by state. Used to seed
// roofing / restoration contractor opportunities after hail, wind, or
// flood events. We don't auto-create leads here (no individual property
// owners are named in NOAA data — it's aggregated by event). Instead, we
// create a marketplace_lead per event/zip pair that tells contractors
// "X event hit your service area on Y, contact owners". Contractors then
// use ad targeting + direct mail to that zip.

import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

// NWS active alerts API — public, no auth, no rate limit issues.
// https://www.weather.gov/documentation/services-web-api
interface NWSAlert {
  id: string;
  properties: {
    id: string;
    event: string;
    severity: string;
    headline: string;
    description: string;
    areaDesc: string;
    sent: string;
    expires: string | null;
    senderName: string;
    parameters?: Record<string, unknown>;
  };
}

interface NWSResponse {
  features: NWSAlert[];
}

const TARGET_EVENTS = new Set([
  "Tornado Warning",
  "Tornado Watch",
  "Severe Thunderstorm Warning",
  "Severe Thunderstorm Watch",
  "Hail",
  "Flood Warning",
  "Flash Flood Warning",
  "High Wind Warning",
  "Hurricane Warning",
  "Hurricane Watch",
  "Tropical Storm Warning",
]);

async function pullAlerts(states: string[]): Promise<NWSAlert[]> {
  const url = `https://api.weather.gov/alerts/active?area=${states.join(",")}`;
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/geo+json",
        "User-Agent": "ContractorFlow/1.0 (storm-leads)",
      },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NWSResponse;
    return data.features ?? [];
  } catch {
    return [];
  }
}

async function runOnce(states: string[]) {
  const admin = createAdminClient();
  const alerts = await pullAlerts(states);

  let inserted = 0;
  let duplicates = 0;
  let skipped = 0;

  for (const a of alerts) {
    if (!TARGET_EVENTS.has(a.properties.event)) { skipped++; continue; }

    const externalId = `nws:${a.properties.id}`;
    const { data: existing } = await admin
      .from("marketplace_leads").select("id")
      .eq("source_channel", "scraped").eq("external_id", externalId).maybeSingle();
    if (existing) { duplicates++; continue; }

    const { error } = await admin.from("marketplace_leads").insert({
      name: `Storm zone · ${a.properties.areaDesc.slice(0, 80)}`,
      service_type: `Storm damage opportunity — ${a.properties.event}`,
      notes:
`${a.properties.headline}

${a.properties.description.slice(0, 600)}

Area: ${a.properties.areaDesc}
Severity: ${a.properties.severity}
Issued: ${a.properties.sent}
Expires: ${a.properties.expires ?? "(unknown)"}
Source: NWS / NOAA`,
      city: null,
      zip: null,
      budget: "unsure",
      timeline: "asap",
      ai_score: 70, // storms create real demand; contractors who move first win
      ai_summary: `${a.properties.event} hitting ${a.properties.areaDesc.split(";")[0]}`,
      price_cents: 500,
      source_channel: "scraped",
      external_id: externalId,
      raw_payload: a as unknown as Record<string, unknown>,
    });
    if (!error) inserted++;
  }

  await admin.from("scraper_runs").insert({
    source: "noaa_storms", region: states.join(","),
    fetched: alerts.length, inserted, duplicates,
  });

  return { fetched: alerts.length, inserted, duplicates, skipped };
}

const ALL_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC","PR",
];

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(request.url);
  const statesParam = url.searchParams.get("states");
  // Default: all 50 states + DC + PR (was MA + neighbors). National coverage.
  const states = statesParam
    ? statesParam.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : ALL_STATES;
  const result = await runOnce(states);
  return NextResponse.json({ ok: true, source: "noaa_storms", states, ...result });
}

export async function POST(request: Request) {
  return GET(request);
}
