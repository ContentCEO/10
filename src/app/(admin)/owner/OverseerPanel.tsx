"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Activity, AlertTriangle, Boxes, CheckCircle2, Clock, Database, FileWarning,
  Loader2, Pause, Play, RefreshCw, ShieldCheck, Sparkles, TrendingUp, Wifi,
  Zap,
} from "lucide-react";

interface ScraperStat {
  source: string;
  last_ran_at: string | null;
  last_fetched: number;
  last_inserted: number;
  last_duplicates: number;
  last_error: string | null;
  total_24h_inserted: number;
  total_24h_runs: number;
}

interface LeadRow {
  id: string;
  name: string | null;
  service_type: string | null;
  city: string | null;
  source_channel: string;
  ai_score: number | null;
  price_cents: number;
  status: string;
  created_at: string;
}

interface Stats {
  ok: boolean;
  generated_at: string;
  rollups: {
    total_leads: number;
    today_leads: number;
    last_hour_leads: number;
    available_leads: number;
    scraped_24h: number;
  };
  channels: { source_channel: string; count: number }[];
  scrapers: ScraperStat[];
  leads: LeadRow[];
  health: Record<string, boolean>;
}

const POLL_INTERVAL_MS = 15_000;

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function isFresh(iso: string | null): "fresh" | "stale" | "cold" {
  if (!iso) return "cold";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 30 * 60 * 1000) return "fresh";  // < 30 min
  if (ms < 4 * 60 * 60 * 1000) return "stale"; // < 4h
  return "cold";
}

export function OverseerPanel({ ownerEmail }: { ownerEmail: string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/owner/stats", { cache: "no-store" });
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }
      const data = (await res.json()) as Stats;
      setStats(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    if (paused) return;
    const id = setInterval(fetchStats, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchStats, paused]);

  return (
    <div className="space-y-6 text-white" style={{ colorScheme: "dark" }}>
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 ring-1 ring-white/10 p-6 sm:p-8">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl animate-blob-drift" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.18em] text-brand-300 flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5" /> Owner overseer · mainframe
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Live system view</span>
            </h1>
            <p className="mt-1 text-sm text-white/60 font-mono">
              {ownerEmail} · polling every {POLL_INTERVAL_MS / 1000}s
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPaused((p) => !p)}
              className="btn bg-white/10 text-white border border-white/15 hover:bg-white/20"
              title={paused ? "Resume auto-refresh" : "Pause auto-refresh"}
            >
              {paused ? <><Play className="h-4 w-4" /> Resume</> : <><Pause className="h-4 w-4" /> Pause</>}
            </button>
            <button onClick={fetchStats} className="btn bg-white/10 text-white border border-white/15 hover:bg-white/20">
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-xl bg-rose-950/40 ring-1 ring-rose-500/30 p-4 flex items-start gap-3 text-rose-200 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div><strong>Stats fetch failed:</strong> {error}</div>
        </div>
      )}

      {!stats ? (
        <div className="card p-12 text-center text-white/60">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-3 text-sm">Booting overseer panel…</p>
        </div>
      ) : (
        <>
          {/* Rollups */}
          <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: "Total leads",      value: stats.rollups.total_leads,     icon: Boxes,      tone: "from-indigo-500 to-violet-500" },
              { label: "Today",            value: stats.rollups.today_leads,     icon: TrendingUp, tone: "from-violet-500 to-fuchsia-500" },
              { label: "Last hour",        value: stats.rollups.last_hour_leads, icon: Zap,        tone: "from-cyan-500 to-blue-500" },
              { label: "Available",        value: stats.rollups.available_leads, icon: CheckCircle2, tone: "from-emerald-500 to-teal-500" },
              { label: "Scraped · 24h",    value: stats.rollups.scraped_24h,     icon: Activity,   tone: "from-amber-500 to-orange-500" },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tone} p-4 text-white shadow-glow`}>
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider opacity-90 font-semibold">
                  <Icon className="h-3 w-3" /> {label}
                </div>
                <div className="mt-2 text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
                <div className="absolute -right-2 -top-2 h-10 w-10 rounded-full bg-white/15" />
              </div>
            ))}
          </section>

          {/* Health */}
          <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
            <div className="text-xs font-mono uppercase tracking-[0.18em] text-brand-300 mb-3 flex items-center gap-2">
              <Database className="h-3.5 w-3.5" /> System health (env vars)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(stats.health).map(([key, ok]) => (
                <div key={key} className={
                  ok
                    ? "flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-200 text-xs font-mono"
                    : "flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 ring-1 ring-rose-500/20 text-rose-200 text-xs font-mono"
                }>
                  {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {key}
                </div>
              ))}
            </div>
          </section>

          {/* Scrapers + channels */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Scraper status board */}
            <section className="lg:col-span-2 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs font-mono uppercase tracking-[0.18em] text-brand-300 flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5" /> Scrapers · last 24h
                </div>
                <span className="text-xs text-white/40 font-mono">
                  {stats.scrapers.length} active
                </span>
              </div>
              <div className="space-y-2">
                {stats.scrapers.length === 0 && (
                  <div className="text-sm text-white/50 text-center py-8">
                    No scraper runs in the last 24h. Cron may not be configured.
                  </div>
                )}
                {stats.scrapers.map((s) => {
                  const freshness = isFresh(s.last_ran_at);
                  const freshColor =
                    freshness === "fresh" ? "bg-emerald-400" :
                    freshness === "stale" ? "bg-amber-400"   : "bg-rose-400";
                  return (
                    <div key={s.source} className="rounded-xl bg-white/[0.02] ring-1 ring-white/5 p-3 hover:bg-white/[0.05] transition">
                      <div className="flex items-center gap-3">
                        <span className={`h-2 w-2 rounded-full ${freshColor} shrink-0`} />
                        <div className="font-mono text-sm font-semibold flex-1 min-w-0 truncate">{s.source}</div>
                        <span className="text-xs text-white/40 font-mono whitespace-nowrap">
                          <Clock className="inline h-3 w-3 mr-0.5" /> {timeAgo(s.last_ran_at)}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <div className="text-white/40">Last fetched</div>
                          <div className="font-mono tabular-nums">{s.last_fetched}</div>
                        </div>
                        <div>
                          <div className="text-white/40">Last inserted</div>
                          <div className="font-mono tabular-nums text-emerald-300">{s.last_inserted}</div>
                        </div>
                        <div>
                          <div className="text-white/40">24h inserts</div>
                          <div className="font-mono tabular-nums">{s.total_24h_inserted}</div>
                        </div>
                        <div>
                          <div className="text-white/40">24h runs</div>
                          <div className="font-mono tabular-nums">{s.total_24h_runs}</div>
                        </div>
                      </div>
                      {s.last_error && (
                        <div className="mt-2 text-xs text-rose-300 bg-rose-500/10 px-2 py-1 rounded font-mono flex items-start gap-1.5">
                          <FileWarning className="h-3 w-3 shrink-0 mt-0.5" />
                          <span className="truncate">{s.last_error}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Source channel breakdown */}
            <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-brand-300 mb-4 flex items-center gap-2">
                <Wifi className="h-3.5 w-3.5" /> Channels · 24h
              </div>
              <div className="space-y-2">
                {stats.channels.length === 0 && <div className="text-sm text-white/50 text-center py-4">No leads in last 24h.</div>}
                {stats.channels.map((c) => {
                  const max = Math.max(...stats.channels.map((x) => x.count), 1);
                  const pct = (c.count / max) * 100;
                  return (
                    <div key={c.source_channel}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-white/80">{c.source_channel}</span>
                        <span className="font-mono tabular-nums text-white/60">{c.count}</span>
                      </div>
                      <div className="mt-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-400 to-cyan-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Live lead feed */}
          <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-brand-300 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Lead firehose · latest 50
              </div>
              <Link href="/admin/marketplace" className="text-xs text-brand-300 hover:underline">
                Full marketplace →
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs font-mono uppercase tracking-wider text-white/40">
                  <tr className="border-b border-white/5">
                    <th className="px-2 py-2 font-semibold">When</th>
                    <th className="px-2 py-2 font-semibold">Service</th>
                    <th className="px-2 py-2 font-semibold">City</th>
                    <th className="px-2 py-2 font-semibold">Source</th>
                    <th className="px-2 py-2 font-semibold text-right">Score</th>
                    <th className="px-2 py-2 font-semibold text-right">Price</th>
                    <th className="px-2 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.leads.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-white/50 text-sm">No leads yet.</td></tr>
                  )}
                  {stats.leads.map((l) => (
                    <tr key={l.id} className="border-b border-white/[0.03] hover:bg-white/[0.03]">
                      <td className="px-2 py-2 text-xs font-mono text-white/60 whitespace-nowrap">{timeAgo(l.created_at)}</td>
                      <td className="px-2 py-2 truncate max-w-xs">{l.service_type ?? "—"}</td>
                      <td className="px-2 py-2 text-white/60">{l.city ?? "—"}</td>
                      <td className="px-2 py-2 text-xs font-mono text-cyan-300">{l.source_channel}</td>
                      <td className="px-2 py-2 text-xs font-mono tabular-nums text-right">{l.ai_score ?? "—"}</td>
                      <td className="px-2 py-2 text-xs font-mono tabular-nums text-right">${(l.price_cents / 100).toFixed(0)}</td>
                      <td className="px-2 py-2 text-xs">
                        <span className={
                          l.status === "available" ? "px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20" :
                          l.status === "sold"      ? "px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/20" :
                                                     "px-1.5 py-0.5 rounded bg-white/10 text-white/60 ring-1 ring-white/15"
                        }>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="text-xs text-white/40 font-mono text-center py-3">
            generated {new Date(stats.generated_at).toLocaleTimeString()} ·
            polling {paused ? "paused" : `every ${POLL_INTERVAL_MS / 1000}s`}
          </footer>
        </>
      )}
    </div>
  );
}
