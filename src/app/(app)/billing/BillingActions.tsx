"use client";

import { useState } from "react";

export function BillingActions({ hasCustomer }: { hasCustomer: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(endpoint: "/api/stripe/checkout" | "/api/stripe/portal", key: string) {
    setLoading(key);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data?.error ?? "Could not start session");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(null);
    }
  }

  return (
    <div className="pt-2 flex flex-wrap gap-2">
      <button
        className="btn-primary"
        onClick={() => go("/api/stripe/checkout", "checkout")}
        disabled={loading !== null}
      >
        {loading === "checkout" ? "Opening checkout…" : "Start subscription"}
      </button>
      {hasCustomer && (
        <button
          className="btn-secondary"
          onClick={() => go("/api/stripe/portal", "portal")}
          disabled={loading !== null}
        >
          {loading === "portal" ? "Opening portal…" : "Manage billing"}
        </button>
      )}
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </div>
  );
}
