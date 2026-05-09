"use client";

import { useState } from "react";

export default function ManageMembership({ cancelAtPeriodEnd }: { cancelAtPeriodEnd: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not open portal.");
      window.location.href = json.url;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      <button className="btn-secondary" onClick={openPortal} disabled={loading}>
        {loading ? "Loading…" : "Manage billing"}
      </button>
      {cancelAtPeriodEnd && (
        <p className="mt-2 text-xs text-amber-700">Cancellation scheduled at period end.</p>
      )}
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
