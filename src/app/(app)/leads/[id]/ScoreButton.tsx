"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function ScoreButton({
  leadId,
  initialScore,
  initialSummary,
}: {
  leadId: string;
  initialScore: number | null;
  initialSummary: string | null;
}) {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(initialScore);
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/score-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to score");
      setScore(data.score);
      setSummary(data.summary);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const tone =
    score == null         ? "bg-slate-100 text-slate-700 ring-slate-200" :
    score >= 75           ? "bg-emerald-100 text-emerald-700 ring-emerald-200" :
    score >= 50           ? "bg-amber-100 text-amber-700 ring-amber-200" :
                            "bg-rose-100 text-rose-700 ring-rose-200";

  return (
    <div className="card p-4 flex items-center gap-3 relative overflow-hidden">
      <div className="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
      <span className={cn("badge text-base px-3 py-1.5", tone)}>
        <Flame className="h-4 w-4 mr-1" />
        {score == null ? "Not scored" : `${score}/100`}
      </span>
      <div className="flex-1 min-w-0 text-sm text-slate-700">
        {summary ?? (
          <span className="text-slate-400">
            Get a Claude-scored close-likelihood with one click.
          </span>
        )}
        {error && <div className="text-rose-600 text-xs mt-1">{error}</div>}
      </div>
      <button onClick={run} disabled={loading} className="btn-primary text-xs !py-1.5 shrink-0">
        <Sparkles className="h-3.5 w-3.5" />
        {loading ? "Scoring…" : score == null ? "Score lead" : "Re-score"}
      </button>
    </div>
  );
}
