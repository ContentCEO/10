"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DiscoverForm() {
  const router = useRouter();
  const [category, setCategory] = useState("Plumber");
  const [city, setCity] = useState("Boston");
  const [state, setState] = useState("MA");
  const [maxResults, setMaxResults] = useState(20);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted?: number; duplicates?: number; error?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const query = `${category} in ${city}, ${state}`;
      const res = await fetch("/api/launchpad/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, category, maxResults }),
      });
      const data = await res.json();
      setResult(data);
      router.refresh();
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
      <Field label="Trade / category">
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          required
          placeholder="e.g. Plumber, HVAC, Roofer, Salon, Dentist"
          className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2"
        />
      </Field>
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="City">
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2"
          />
        </Field>
        <Field label="State (2-letter)">
          <input
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
            required
            className="w-full rounded-lg bg-white/5 border border-white/15 px-3 py-2"
          />
        </Field>
      </div>
      <Field label="Max results (1-20)">
        <input
          type="number"
          min={1}
          max={20}
          value={maxResults}
          onChange={(e) => setMaxResults(Number(e.target.value))}
          className="w-32 rounded-lg bg-white/5 border border-white/15 px-3 py-2"
        />
      </Field>

      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-brand-gradient px-5 py-2.5 font-semibold shadow-glow disabled:opacity-50"
      >
        {busy ? "Discovering…" : "Discover prospects"}
      </button>

      {result && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
          {result.error ? (
            <span className="text-red-300">Error: {result.error}</span>
          ) : (
            <span>
              <strong className="text-emerald-300">{result.inserted ?? 0}</strong> new prospects,{" "}
              <strong className="text-white/70">{result.duplicates ?? 0}</strong> duplicates updated.
            </span>
          )}
        </div>
      )}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <div className="text-xs uppercase tracking-wider text-white/60 mb-1">{label}</div>
      {children}
    </label>
  );
}
