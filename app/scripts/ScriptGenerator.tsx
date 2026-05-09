"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";

export function ScriptGenerator() {
  const router = useRouter();
  const [trade, setTrade] = useState("Roofing");
  const [scenario, setScenario] = useState("");
  const [tone, setTone] = useState("Friendly, confident");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ name: string; body: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function generate(save: boolean) {
    setError(null);
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trade, scenario, tone, notes, save }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult({ name: data.name, body: data.body });
      if (save) {
        setSaved(true);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Trade</label>
          <input
            className="input"
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Tone</label>
          <input
            className="input"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Scenario</label>
          <input
            className="input"
            placeholder="e.g. First in-home estimate for a full roof replacement"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="label">Notes (optional)</label>
          <textarea
            className="input min-h-[80px]"
            placeholder="Anything specific about the customer, your pricing, common pushback…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary"
          onClick={() => generate(false)}
          disabled={loading || !scenario.trim()}
        >
          {loading ? "Generating…" : "Generate script"}
        </button>
        {result ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => generate(true)}
            disabled={loading}
          >
            {saved ? "Saved" : "Save to library"}
          </button>
        ) : null}
      </div>

      {result ? (
        <div className="mt-6 rounded-md border border-ink-700 bg-ink-900 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white">{result.name}</div>
            <CopyButton text={result.body} />
          </div>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-ink-200">
            {result.body}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
