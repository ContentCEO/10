"use client";

import { useState } from "react";

export function CheckoutButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { url?: string };
      if (data.url) window.location.href = data.url;
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={go} disabled={busy} className="btn-primary">
        {busy ? "Redirecting…" : "Upgrade to Pro"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
