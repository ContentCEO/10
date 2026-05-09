"use client";

import { useState } from "react";

export default function BillingActions({ hasSubscription }: { hasSubscription: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await r.json();
      if (!r.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button className="btn-primary" onClick={checkout} disabled={loading}>
        {loading ? "Redirecting…" : hasSubscription ? "Manage subscription" : "Upgrade to Pro"}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
