"use client";

import { useState } from "react";

export function UpgradeButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        type="button"
        className="btn-primary w-full"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          try {
            const res = await fetch("/api/stripe/checkout", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Checkout failed");
            window.location.href = data.url;
          } catch (err) {
            setError(err instanceof Error ? err.message : "Checkout failed");
            setLoading(false);
          }
        }}
      >
        {loading ? "Redirecting…" : "Upgrade to Pro"}
      </button>
      {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
