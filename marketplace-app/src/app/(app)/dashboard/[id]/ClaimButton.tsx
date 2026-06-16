"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";

const EMERALD = "#10b981";

export function ClaimButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/leads/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: leadId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Claim failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <button type="button" onClick={claim} disabled={pending}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-60"
        style={{ background: `linear-gradient(135deg, ${EMERALD}, #059669)`, color: "#fff", boxShadow: `0 10px 22px -8px ${EMERALD}88` }}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {pending ? "Claiming..." : "Claim this lead"}
      </button>
      {error && (
        <div className="mt-2 text-xs" style={{ color: "#fda4af" }}>{error}</div>
      )}
    </div>
  );
}
