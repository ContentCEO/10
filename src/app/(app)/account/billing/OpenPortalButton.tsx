"use client";

import { useState } from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "@/components/Toaster";

export function OpenPortalButton() {
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
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

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] ring-1 ring-white/15 text-white hover:bg-white/[0.10] px-3 py-2 text-xs font-semibold disabled:opacity-50 transition"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
      Manage in Stripe
    </button>
  );
}
