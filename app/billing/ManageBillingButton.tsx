"use client";

import { useState } from "react";

export function ManageBillingButton() {
  const [loading, setLoading] = useState(false);
  async function go() {
    setLoading(true);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const j = await res.json();
    if (j.url) {
      window.location.href = j.url;
    } else {
      alert(j.error || "Failed to open portal");
      setLoading(false);
    }
  }
  return (
    <button onClick={go} disabled={loading} className="btn-outline">
      {loading ? "Loading…" : "Manage billing"}
    </button>
  );
}
