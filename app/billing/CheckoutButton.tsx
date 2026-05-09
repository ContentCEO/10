"use client";

import { useState } from "react";

export function CheckoutButton({ plan }: { plan: "starter" | "pro" }) {
  const [loading, setLoading] = useState(false);
  async function go() {
    setLoading(true);
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const j = await res.json();
    if (j.url) {
      window.location.href = j.url;
    } else {
      alert(j.error || "Failed to start checkout");
      setLoading(false);
    }
  }
  return (
    <button onClick={go} disabled={loading} className="btn-primary mt-6">
      {loading ? "Loading…" : "Upgrade"}
    </button>
  );
}
