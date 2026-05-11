"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not claim lead");
      router.push(`/leads/${data.leadId}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={claim} disabled={loading} className="btn-primary text-xs !py-1.5">
        {loading ? "Claiming…" : "Claim lead"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
