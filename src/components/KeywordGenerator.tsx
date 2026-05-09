"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function KeywordGenerator({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useState(15);
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/ai/keywords", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId, count }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <label className="label">How many ideas?</label>
        <input
          type="number"
          min={5}
          max={50}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="input w-32"
        />
      </div>
      <div className="flex flex-col items-end gap-1">
        <button className="btn-primary" disabled={busy} onClick={generate}>
          {busy ? "Generating…" : "Generate ideas"}
        </button>
        {err && <span className="text-xs text-red-600">{err}</span>}
      </div>
    </div>
  );
}
