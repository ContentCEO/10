"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RunAuditButton({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ai/audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to run audit");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={run} disabled={busy} className="btn-primary">
        {busy ? "Auditing…" : "Run new audit"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  );
}
