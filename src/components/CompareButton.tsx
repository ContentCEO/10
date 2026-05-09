"use client";

import { useState } from "react";

type Insight = { area: string; you: string; them: string; gap: string };

export function CompareButton({ businessId }: { businessId: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ summary: string; insights: Insight[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/competitors", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { summary: string; insights: Insight[] };
      setResult(data);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button onClick={run} disabled={busy} className="btn-primary">
        {busy ? "Comparing…" : "AI compare"}
      </button>
      {err && <span className="text-xs text-red-600">{err}</span>}
      {result && (
        <div className="mt-3 w-full rounded-lg border border-brand-200 bg-brand-50 p-4">
          <div className="text-xs font-semibold uppercase text-brand-700">Comparison summary</div>
          <p className="mt-1 text-sm text-slate-800">{result.summary}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {result.insights.map((it, i) => (
              <li key={i} className="rounded-md bg-white p-2">
                <div className="text-xs uppercase text-slate-500">{it.area}</div>
                <div className="mt-1 text-slate-800"><b>You:</b> {it.you}</div>
                <div className="text-slate-800"><b>Them:</b> {it.them}</div>
                <div className="mt-1 text-slate-600"><b>Gap:</b> {it.gap}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
