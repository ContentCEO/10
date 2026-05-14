"use client";

import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

export function WeeklyDigest() {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/digest", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not generate digest");
      setText(data.text ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
      <div className="relative flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-glow">
          <Sparkles className="h-4 w-4" />
        </span>
        <h2 className="font-semibold">This week, from your AI coach</h2>
        <button
          onClick={generate}
          disabled={loading}
          className={`ml-auto text-xs ${text ? "btn-secondary" : "btn-primary"} !py-1`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Thinking…" : text ? "Refresh" : "Generate"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {text ? (
        <pre className="mt-3 whitespace-pre-wrap text-sm text-slate-800 font-sans leading-relaxed">{text}</pre>
      ) : !error && !loading && (
        <p className="mt-3 text-sm text-slate-500">
          Tap <strong>Generate</strong> for a Claude-written briefing of last week —
          revenue, what's working, what's at risk, what to do today.
        </p>
      )}
    </div>
  );
}
