"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { toast } from "@/components/Toaster";

export function ScraperRunNowButton({ source }: { source: string }) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 65_000);
    try {
      const res = await fetch(`/api/owner/scrapers/run?source=${encodeURIComponent(source)}`, {
        method: "POST",
        cache: "no-store",
        signal: ctrl.signal,
      });
      clearTimeout(timeout);
      const j = await res.json().catch(() => ({} as { ok?: boolean; error?: string; totalInserted?: number; totalFetched?: number }));
      if (!res.ok || j?.ok === false) {
        toast({ message: `Run failed: ${j?.error ?? res.statusText}`, type: "error" });
        return;
      }
      const inserted = j?.totalInserted ?? 0;
      const fetched = j?.totalFetched ?? 0;
      toast({ message: `${source}: ${inserted} inserted / ${fetched} fetched`, type: "success" });
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      clearTimeout(timeout);
      const err = e as Error;
      const msg = err.name === "AbortError"
        ? "Still running — refresh in a minute to see results."
        : `Run failed: ${err.message}`;
      toast({ message: msg, type: err.name === "AbortError" ? "success" : "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={busy}
      className="inline-flex items-center gap-1 text-xs font-medium rounded-md bg-white/[0.06] ring-1 ring-white/10 px-2 py-1 text-white/80 hover:bg-white/[0.10] hover:text-white disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
      {busy ? "Running" : "Run"}
    </button>
  );
}
