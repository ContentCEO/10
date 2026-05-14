"use client";

import { useState } from "react";
import { Check, Compass, Copy, Sparkles } from "lucide-react";

type Suggestion = { headline: string; why: string; draft: string };

export function NextActionPanel({ leadId }: { leadId: string }) {
  const [data, setData] = useState<Suggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch("/api/ai/next-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not generate");
      setData(body as Suggestion);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!data) return;
    await navigator.clipboard.writeText(data.draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="card p-5 space-y-4 relative overflow-hidden">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
      <div className="relative flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-glow">
          <Compass className="h-4 w-4" />
        </span>
        <h2 className="font-semibold">Next best action</h2>
        <button onClick={generate} disabled={loading}
          className={`ml-auto text-xs ${data ? "btn-secondary" : "btn-primary"} !py-1`}>
          <Sparkles className="h-3.5 w-3.5" />
          {loading ? "Thinking…" : data ? "Refresh" : "Suggest"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <div className="space-y-3">
          <div>
            <div className="text-lg font-bold gradient-text">{data.headline}</div>
            {data.why && <p className="text-sm text-slate-600 mt-1">{data.why}</p>}
          </div>
          {data.draft && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 relative">
              <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans">{data.draft}</pre>
              <button onClick={copy}
                className="absolute top-2 right-2 btn-secondary !py-1 !px-2 text-xs">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>
      )}

      {!data && !loading && !error && (
        <p className="text-sm text-slate-500">
          Stuck on what to do with this lead? Get a Claude-coached suggestion based on
          the status, age, and notes.
        </p>
      )}
    </div>
  );
}
