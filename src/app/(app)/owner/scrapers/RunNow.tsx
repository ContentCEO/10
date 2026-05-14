"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";
import { toast } from "@/components/Toaster";

export function ScraperRunNowButton({ source }: { source: string }) {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/owner/scrapers/run?source=${encodeURIComponent(source)}`, {
        method: "POST",
        cache: "no-store",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        toast({ message: `Run failed: ${j?.error ?? res.statusText}`, type: "error" });
        return;
      }
      const inserted = j?.totalInserted ?? j?.inserted ?? "?";
      const fetched = j?.totalFetched ?? j?.fetched ?? "?";
      toast({ message: `${source}: ${inserted} inserted / ${fetched} fetched`, type: "success" });
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast({ message: `Run failed: ${(e as Error).message}`, type: "error" });
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
