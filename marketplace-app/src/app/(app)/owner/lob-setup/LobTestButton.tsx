"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "@/components/Toaster";

interface TestResult {
  ok: boolean;
  stage?: string;
  status?: number;
  error?: string;
  test_mode?: boolean;
  postcard_id?: string;
  preview_url?: string | null;
  expected_delivery?: string | null;
}

export function LobTestButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  async function run() {
    if (busy) return;
    if (!confirm("Send a test postcard? On a LIVE key this mails a real card (~$0.85).")) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/owner/lob-test", { method: "POST", cache: "no-store" });
      const j = await res.json().catch(() => ({ ok: false, error: "Invalid JSON" } as TestResult));
      setResult(j);
      if (j.ok) {
        toast({ message: `Test sent · ${j.test_mode ? "TEST mode" : "LIVE"} · ID ${j.postcard_id?.slice(0, 12)}…`, type: "success" });
      } else {
        toast({ message: `Test failed: ${j.error ?? "unknown"}`, type: "error" });
      }
    } catch (e) {
      toast({ message: (e as Error).message, type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] ring-1 ring-white/15 text-white/80 hover:bg-white/[0.10] hover:text-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Test postcard
      </button>
      {result?.ok && result.preview_url && (
        <a href={result.preview_url} target="_blank" rel="noreferrer" className="text-[10px] text-brand-300 hover:underline font-mono">
          View preview →
        </a>
      )}
    </div>
  );
}
