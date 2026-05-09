"use client";

import { useState } from "react";

export function BillingActions({ isPro, hasSubscription }: { isPro: boolean; hasSubscription: boolean }) {
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(path: "checkout" | "portal") {
    setLoading(path);
    setError(null);
    try {
      const res = await fetch(`/api/stripe/${path}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Stripe request failed");
      if (data.url) window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(null);
    }
  }

  if (isPro) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-gray-700">You're on the Pro plan. Manage payment, invoices, and cancellation in Stripe.</p>
        <button onClick={() => start("portal")} className="btn-primary" disabled={loading !== null || !hasSubscription}>
          {loading === "portal" ? "Opening portal…" : "Manage subscription"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-gray-700">Upgrade to Pro for unlimited proposals and priority AI generation.</p>
      <button onClick={() => start("checkout")} className="btn-primary" disabled={loading !== null}>
        {loading === "checkout" ? "Redirecting…" : "Upgrade to Pro"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
