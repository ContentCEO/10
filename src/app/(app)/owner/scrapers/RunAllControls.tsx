"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, Pause, Play, Repeat, ShieldAlert, Trash2, Zap } from "lucide-react";
import { toast } from "@/components/Toaster";

interface Props {
  sources: string[];
}

interface RunResult {
  source: string;
  ok: boolean;
  inserted: number;
  fetched: number;
  error?: string;
}

const INTERVAL_OPTIONS = [
  { label: "2 min",  ms: 2  * 60_000 },
  { label: "5 min",  ms: 5  * 60_000 },
  { label: "15 min", ms: 15 * 60_000 },
  { label: "30 min", ms: 30 * 60_000 },
];

const DURATION_OPTIONS = [
  { label: "15 min", ms: 15 * 60_000 },
  { label: "1 hr",   ms: 60 * 60_000 },
  { label: "4 hr",   ms: 4  * 60 * 60_000 },
  { label: "24 hr",  ms: 24 * 60 * 60_000 },
];

async function runOne(source: string): Promise<RunResult> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 65_000);
    const res = await fetch(`/api/owner/scrapers/run?source=${encodeURIComponent(source)}`, {
      method: "POST",
      cache: "no-store",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const j = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok || (j as { ok?: boolean }).ok === false) {
      return {
        source, ok: false,
        inserted: 0, fetched: 0,
        error: ((j as { error?: string }).error) ?? res.statusText,
      };
    }
    return {
      source, ok: true,
      inserted: Number((j as { totalInserted?: number }).totalInserted ?? 0),
      fetched: Number((j as { totalFetched?: number }).totalFetched ?? 0),
    };
  } catch (e) {
    return { source, ok: false, inserted: 0, fetched: 0, error: (e as Error).message };
  }
}

interface BatchDataTestResult {
  ok: boolean;
  stage: string;
  http_status?: number;
  latency_ms?: number;
  persons_returned?: number;
  phones_found?: number;
  phones_sample?: string[];
  error?: string;
  body_preview?: string;
}

export function RunAllControls({ sources }: Props) {
  const [busy, setBusy] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<BatchDataTestResult | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; current: string } | null>(null);
  const [results, setResults] = useState<RunResult[]>([]);

  async function testBatchData() {
    if (testing) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/owner/batchdata-test", { method: "POST", cache: "no-store" });
      const j = await res.json().catch(() => ({ ok: false, stage: "parse", error: "Invalid JSON" } as BatchDataTestResult));
      setTestResult(j as BatchDataTestResult);
    } catch (e) {
      setTestResult({ ok: false, stage: "fetch", error: (e as Error).message });
    } finally {
      setTesting(false);
    }
  }

  async function wipeScraped() {
    if (wiping) return;
    if (!confirm("Permanently delete ALL scraped leads (marketplace + /leads)? Sold rows are kept.")) return;
    setWiping(true);
    try {
      const res = await fetch("/api/owner/wipe-scraped", { method: "POST", cache: "no-store" });
      const j = await res.json().catch(() => ({} as { ok?: boolean; error?: string; marketplace_deleted?: number; leads_deleted?: number }));
      if (!res.ok || j?.ok === false) {
        toast({ message: `Wipe failed: ${j?.error ?? res.statusText}`, type: "error" });
        return;
      }
      const m = j?.marketplace_deleted ?? 0;
      const l = j?.leads_deleted ?? 0;
      toast({ message: `Wiped ${m} marketplace_leads + ${l} /leads rows`, type: "success" });
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      toast({ message: `Wipe failed: ${(e as Error).message}`, type: "error" });
    } finally {
      setWiping(false);
    }
  }

  const [interval, setIntervalMs]     = useState<number>(INTERVAL_OPTIONS[1].ms);
  const [duration, setDurationMs]     = useState<number>(DURATION_OPTIONS[1].ms);
  const [scheduleActive, setScheduleActive] = useState(false);
  const [scheduleEnd, setScheduleEnd] = useState<number | null>(null);
  const [tickCount, setTickCount]     = useState(0);

  const scheduleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimer     = useRef<ReturnType<typeof setTimeout>  | null>(null);

  async function runAll() {
    if (busy) return;
    setBusy(true);
    setResults([]);
    setProgress({ done: 0, total: sources.length, current: sources[0] ?? "" });
    const collected: RunResult[] = [];
    for (let i = 0; i < sources.length; i++) {
      setProgress({ done: i, total: sources.length, current: sources[i] });
      const r = await runOne(sources[i]);
      collected.push(r);
      setResults([...collected]);
    }
    setProgress({ done: sources.length, total: sources.length, current: "" });
    const totalInserted = collected.reduce((s, r) => s + r.inserted, 0);
    const totalFetched  = collected.reduce((s, r) => s + r.fetched, 0);
    const failed = collected.filter((r) => !r.ok).length;
    toast({
      message: `Run all done: ${totalInserted} inserted / ${totalFetched} fetched · ${failed} failed`,
      type: failed === 0 ? "success" : "error",
    });
    setBusy(false);
    setTimeout(() => window.location.reload(), 1200);
  }

  function startSchedule() {
    if (scheduleActive) return;
    const end = Date.now() + duration;
    setScheduleEnd(end);
    setScheduleActive(true);
    setTickCount(0);

    // Kick off immediately, then on interval.
    void runAll().then(() => setTickCount(1));
    scheduleTimer.current = setInterval(() => {
      setTickCount((c) => c + 1);
      void runAll();
    }, interval);

    stopTimer.current = setTimeout(() => stopSchedule(), duration);
  }

  function stopSchedule() {
    if (scheduleTimer.current) { clearInterval(scheduleTimer.current); scheduleTimer.current = null; }
    if (stopTimer.current)     { clearTimeout(stopTimer.current);     stopTimer.current = null; }
    setScheduleActive(false);
    setScheduleEnd(null);
  }

  useEffect(() => () => {
    if (scheduleTimer.current) clearInterval(scheduleTimer.current);
    if (stopTimer.current)     clearTimeout(stopTimer.current);
  }, []);

  const minutesLeft = scheduleEnd ? Math.max(0, Math.round((scheduleEnd - Date.now()) / 60_000)) : 0;
  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="card p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Manual run controls</div>
          <div className="text-xs text-white/50 mt-0.5">
            Auto-scraping already runs 24/7 server-side. Use these for one-off forced runs (e.g., right after fixing a setting).
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={testBatchData}
            disabled={testing}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] ring-1 ring-white/15 text-white/80 hover:bg-white/[0.10] hover:text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
            Test BatchData
          </button>
          <button
            type="button"
            onClick={wipeScraped}
            disabled={busy || scheduleActive || wiping}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/15 ring-1 ring-rose-400/30 text-rose-200 hover:bg-rose-500/25 px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
          >
            {wiping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Wipe all scraped
          </button>
          <button
            type="button"
            onClick={runAll}
            disabled={busy || scheduleActive}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/20 ring-1 ring-brand-400/40 text-brand-100 hover:bg-brand-500/30 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          >
            {busy && !scheduleActive ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
            Run all now
          </button>
        </div>
      </div>

      {testResult && (
        <div
          className={
            testResult.ok
              ? "rounded-lg bg-emerald-500/10 ring-1 ring-emerald-400/30 p-3 text-xs space-y-1"
              : "rounded-lg bg-rose-500/10 ring-1 ring-rose-400/30 p-3 text-xs space-y-1"
          }
        >
          <div className="flex items-center gap-2 font-semibold">
            {testResult.ok
              ? <><CheckCircle2 className="h-4 w-4 text-emerald-300" /> <span className="text-emerald-200">BatchData responded successfully</span></>
              : <><ShieldAlert className="h-4 w-4 text-rose-300" /> <span className="text-rose-200">BatchData test failed ({testResult.stage})</span></>}
          </div>
          {testResult.ok && (
            <div className="text-white/70 font-mono">
              HTTP {testResult.http_status} · {testResult.latency_ms}ms · {testResult.persons_returned ?? 0} persons · {testResult.phones_found ?? 0} phones
              {testResult.phones_sample && testResult.phones_sample.length > 0 && (
                <div className="text-emerald-200">Sample: {testResult.phones_sample.join(", ")}</div>
              )}
            </div>
          )}
          {testResult.error && <div className="text-rose-200">{testResult.error}</div>}
          {testResult.body_preview && (
            <details className="text-white/50 font-mono">
              <summary className="cursor-pointer">Raw response</summary>
              <pre className="mt-1 whitespace-pre-wrap break-all">{testResult.body_preview}</pre>
            </details>
          )}
        </div>
      )}

      {progress && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-mono text-white/60">
            <span>{progress.current || "done"}</span>
            <span>{progress.done}/{progress.total}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <div className="h-full bg-brand-400 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="border-t border-white/5 pt-3">
        <div className="flex items-center gap-2 mb-2">
          <Repeat className="h-3.5 w-3.5 text-white/50" />
          <span className="text-xs font-semibold text-white/80">Scheduled mode</span>
          {scheduleActive && (
            <span className="ml-auto text-[10px] font-mono text-emerald-300">
              tick {tickCount} · {minutesLeft}m left
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex flex-col gap-1">
            <span className="text-white/50 text-[10px] uppercase tracking-wider">Every</span>
            <select
              value={interval}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
              disabled={scheduleActive}
              className="rounded-md bg-white/[0.04] ring-1 ring-white/10 text-white px-2 py-1.5 text-xs disabled:opacity-50"
            >
              {INTERVAL_OPTIONS.map((o) => <option key={o.ms} value={o.ms}>{o.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-white/50 text-[10px] uppercase tracking-wider">For</span>
            <select
              value={duration}
              onChange={(e) => setDurationMs(Number(e.target.value))}
              disabled={scheduleActive}
              className="rounded-md bg-white/[0.04] ring-1 ring-white/10 text-white px-2 py-1.5 text-xs disabled:opacity-50"
            >
              {DURATION_OPTIONS.map((o) => <option key={o.ms} value={o.ms}>{o.label}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-2">
          {!scheduleActive ? (
            <button
              type="button"
              onClick={startSchedule}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" /> Start schedule
            </button>
          ) : (
            <button
              type="button"
              onClick={stopSchedule}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/20 ring-1 ring-rose-400/40 text-rose-200 hover:bg-rose-500/30 px-3 py-1.5 text-xs font-semibold"
            >
              <Pause className="h-3.5 w-3.5" /> Stop
            </button>
          )}
          <p className="text-[10px] text-white/40 mt-1.5 font-mono">
            Keep this tab open. Closing it ends the schedule.
          </p>
        </div>
      </div>

      {results.length > 0 && (
        <div className="border-t border-white/5 pt-3 max-h-48 overflow-y-auto">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-white/5">
              {results.map((r) => (
                <tr key={r.source} className={r.ok ? "" : "bg-rose-500/[0.04]"}>
                  <td className="py-1 text-white/80 font-mono">{r.source}</td>
                  <td className="py-1 text-right tabular-nums">
                    <span className={r.inserted > 0 ? "text-emerald-300" : "text-white/40"}>+{r.inserted}</span>
                    <span className="text-white/30 ml-2">/{r.fetched}</span>
                  </td>
                  <td className="py-1 text-right text-[10px]">
                    {r.ok ? <span className="text-emerald-400">ok</span> : <span className="text-rose-300 truncate inline-block max-w-[160px]" title={r.error}>{r.error?.slice(0, 24) ?? "fail"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
