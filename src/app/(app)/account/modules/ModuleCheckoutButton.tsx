"use client";

import { useState } from "react";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "@/components/Toaster";

export function ModuleCheckoutButton({ envKey, isActive }: { envKey: string; isActive: boolean }) {
  const [busy, setBusy] = useState(false);

  async function buy() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/module-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envKey }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.url) {
        toast({ message: (j as { error?: string }).error ?? `HTTP ${res.status}`, type: "error" });
        setBusy(false);
        return;
      }
      window.location.href = j.url as string;
    } catch (e) {
      toast({ message: (e as Error).message, type: "error" });
      setBusy(false);
    }
  }

  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" /> Already on this module
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={buy}
      disabled={busy}
      className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-500 text-white font-semibold px-3 py-2 text-xs hover:bg-brand-400 disabled:opacity-50 transition"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
      {busy ? "Opening Stripe…" : "Unlock"}
    </button>
  );
}
