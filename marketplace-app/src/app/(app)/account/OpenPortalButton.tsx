"use client";

import { useTransition, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

const EMERALD = "#10b981";

export function OpenPortalButton({ label = "Manage subscription", iconOnly }: {
  label?: string;
  iconOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error || "Portal unavailable");
        return;
      }
      window.location.href = data.url as string;
    });
  }

  return (
    <div className={iconOnly ? "" : "min-w-[180px]"}>
      <button type="button" onClick={open} disabled={pending}
        className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.02] disabled:opacity-60"
        style={{ background: EMERALD, color: "#fff", boxShadow: `0 8px 18px -6px ${EMERALD}66` }}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
        {label}
      </button>
      {error && <div className="mt-1.5 text-[11px]" style={{ color: "#fda4af" }}>{error}</div>}
    </div>
  );
}
