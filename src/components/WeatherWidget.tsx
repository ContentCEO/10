"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudRain, Loader2, Snowflake, Sun, Wind } from "lucide-react";

interface Day {
  date: string;
  label: string;
  code: number;
  high: number;
  low: number;
  rain_pct: number;
  rain_in: number;
  wind_mph: number;
}

interface ForecastResponse {
  ok: boolean;
  place?: string;
  days?: Day[];
  error?: string;
}

function iconFor(code: number) {
  if (code === 0 || [1, 2].includes(code))           return Sun;
  if ([71, 73, 75, 77, 85, 86].includes(code))       return Snowflake;
  if ([61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code)) return CloudRain;
  return Sun;
}

export function WeatherWidget({ zip }: { zip?: string }) {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchForecast = useCallback(async () => {
    try {
      const res = await fetch(`/api/weather?zip=${encodeURIComponent(zip ?? "02445")}`, { cache: "no-store" });
      const json = await res.json() as ForecastResponse;
      setData(json);
    } catch {
      setData({ ok: false, error: "Failed to fetch" });
    } finally {
      setLoading(false);
    }
  }, [zip]);

  useEffect(() => { fetchForecast(); }, [fetchForecast]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5 text-center text-white/40">
        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
      </div>
    );
  }

  if (!data?.ok || !data.days) {
    return (
      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5 text-center text-white/40 text-xs">
        Weather unavailable.
      </div>
    );
  }

  const today = data.days[0];
  const heavyRain = today.rain_pct >= 60 || today.rain_in >= 0.25;

  return (
    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-mono uppercase tracking-[0.18em] text-brand-300 flex items-center gap-2">
          <Sun className="h-3.5 w-3.5" /> Weather · {data.place}
        </div>
      </div>
      {heavyRain && (
        <div className="mb-3 rounded-lg bg-amber-500/15 ring-1 ring-amber-400/30 px-3 py-2 text-xs text-amber-200 flex items-center gap-2">
          <CloudRain className="h-3.5 w-3.5" />
          Rain expected today ({today.rain_pct}% · {today.rain_in}&quot;). Plan to reschedule outdoor work.
        </div>
      )}
      <div className="grid grid-cols-3 gap-2">
        {data.days.map((d, i) => {
          const Icon = iconFor(d.code);
          const day = i === 0 ? "Today" : new Date(d.date).toLocaleDateString("en-US", { weekday: "short" });
          return (
            <div key={d.date} className="rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">{day}</div>
              <Icon className="h-6 w-6 mx-auto mt-1.5 text-white/80" />
              <div className="mt-1 text-xs text-white/70">{d.label}</div>
              <div className="mt-1 text-sm font-semibold">
                <span>{d.high}°</span>
                <span className="text-white/40"> / {d.low}°</span>
              </div>
              <div className="mt-1 text-[10px] text-white/45 flex items-center justify-center gap-2 font-mono">
                <span><CloudRain className="inline h-2.5 w-2.5 mr-0.5" />{d.rain_pct}%</span>
                <span><Wind className="inline h-2.5 w-2.5 mr-0.5" />{d.wind_mph}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
