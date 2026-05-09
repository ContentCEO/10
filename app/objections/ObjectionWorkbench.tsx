"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CopyButton } from "@/components/CopyButton";

const COMMON = [
  "Your price is too high.",
  "I need to think about it.",
  "I have to talk to my spouse.",
  "I'm getting other quotes.",
  "Can you do it cheaper?",
  "We're not ready to move forward right now.",
];

export function ObjectionWorkbench() {
  const router = useRouter();
  const [objection, setObjection] = useState("");
  const [trade, setTrade] = useState("Roofing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ category: string; response: string } | null>(null);
  const [saved, setSaved] = useState(false);

  async function generate(save: boolean) {
    setError(null);
    setLoading(true);
    setSaved(false);
    try {
      const res = await fetch("/api/objections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objection, trade, save }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setResult({ category: data.category, response: data.response });
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
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="label">The objection</label>
          <input
            className="input"
            placeholder="What did the homeowner say?"
            value={objection}
            onChange={(e) => setObjection(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Trade</label>
          <input
            className="input"
            value={trade}
            onChange={(e) => setTrade(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {COMMON.map((c) => (
          <button
            type="button"
            key={c}
            className="rounded-full border border-ink-700 px-3 py-1 text-xs text-ink-200 hover:bg-ink-700/60"
            onClick={() => setObjection(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          className="btn-primary"
          onClick={() => generate(false)}
          disabled={loading || !objection.trim()}
        >
          {loading ? "Generating…" : "Get response"}
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
            <span className="badge bg-brand-500/20 text-brand-200">
              {result.category}
            </span>
            <CopyButton text={result.response} />
          </div>
          <p className="mt-3 text-sm text-ink-200">{result.response}</p>
        </div>
      ) : null}
    </div>
  );
}
