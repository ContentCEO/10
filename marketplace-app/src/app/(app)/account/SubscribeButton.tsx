"use client";

import { useTransition, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

const EMERALD = "#10b981";

export function SubscribeButton({ tier, label, accent }: {
  tier: string;
  label: string;
  accent?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error || "Checkout failed");
        return;
      }
      window.location.href = data.url as string;
    });
  }

  return (
    <div>
      <button type="button" onClick={go} disabled={pending}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] disabled:opacity-60"
        style={accent
          ? { background: `linear-gradient(135deg, ${EMERALD}, #059669)`, color: "#fff", boxShadow: `0 6px 16px -4px ${EMERALD}66` }
          : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.14)" }}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
        {label}
      </button>
      {error && <div className="mt-1.5 text-[11px]" style={{ color: "#fda4af" }}>{error}</div>}
    </div>
  );
}
