import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Plan 1 / A-17 — Weather widget data feed.
// GET /api/weather?zip=02445
// Uses Open-Meteo (free, no key, fair-use friendly). Returns a 3-day
// forecast with the rain/wind flags a contractor cares about for
// outdoor jobs.

interface Geocode { results?: { latitude: number; longitude: number; name?: string; admin1?: string }[] }
interface Forecast {
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    precipitation_sum: number[];
    wind_speed_10m_max: number[];
    weather_code: number[];
  };
}

function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Partly cloudy";
  if ([45, 48].includes(code)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Cloudy";
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const zip = url.searchParams.get("zip") ?? "02445";

  try {
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?postal_code=${encodeURIComponent(zip)}&country=US&count=1`, { cache: "no-store" });
    const geo = await geoRes.json() as Geocode;
    const place = geo.results?.[0];
    if (!place) return NextResponse.json({ ok: false, error: "ZIP not found" }, { status: 404 });

    const fcRes = await fetch(
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${place.latitude}&longitude=${place.longitude}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,weather_code` +
      `&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=3`,
      { next: { revalidate: 1800 } },
    );
    const fc = await fcRes.json() as Forecast;
    const d = fc.daily;
    if (!d) return NextResponse.json({ ok: false, error: "No forecast data" }, { status: 502 });

    const days = d.time.map((t, i) => ({
      date:     t,
      label:    weatherLabel(d.weather_code[i]),
      code:     d.weather_code[i],
      high:     Math.round(d.temperature_2m_max[i]),
      low:      Math.round(d.temperature_2m_min[i]),
      rain_pct: d.precipitation_probability_max[i] ?? 0,
      rain_in:  d.precipitation_sum[i] ?? 0,
      wind_mph: Math.round(d.wind_speed_10m_max[i]),
    }));

    return NextResponse.json({
      ok: true,
      place: `${place.name ?? zip}${place.admin1 ? `, ${place.admin1}` : ""}`,
      days,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "fetch failed" }, { status: 500 });
  }
}
