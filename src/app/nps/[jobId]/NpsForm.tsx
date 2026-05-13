"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";

export function NpsForm({ jobId, initialScore }: { jobId: string; initialScore: number | null }) {
  const [score, setScore] = useState<number | null>(initialScore);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (score == null) return;
    startTransition(async () => {
      try {
        await fetch("/api/nps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: jobId, score, comment: comment.trim() || undefined }),
        });
      } catch { /* */ }
      setDone(true);
    });
  }

  return (
    <main className="min-h-screen bg-ink-950 text-white py-16 px-4"
          style={{ background: "radial-gradient(900px 600px at 50% -10%, rgba(99,102,241,0.30), transparent 60%), linear-gradient(180deg, #0a0f1f 0%, #0c1224 100%)" }}>
      <div className="max-w-xl mx-auto">
        {done ? (
          <div className="text-center py-12">
            <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-300" />
            <h1 className="mt-4 text-2xl font-bold">Thanks for the feedback.</h1>
            <p className="mt-2 text-white/65">It really helps small shops like ours.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10 p-6 sm:p-8">
            <h1 className="text-2xl font-bold flex items-center gap-2"><Star className="h-5 w-5 text-amber-300 fill-current" /> One quick question</h1>
            <p className="mt-2 text-white/65">How likely are you to recommend us to a friend? <span className="text-white/40">(0 = not at all, 10 = absolutely)</span></p>
            <div className="mt-6 grid grid-cols-11 gap-1.5">
              {Array.from({ length: 11 }).map((_, n) => (
                <button
                  key={n}
                  onClick={() => setScore(n)}
                  className={
                    score === n
                      ? "h-12 rounded-lg bg-brand-gradient text-white font-semibold shadow-glow ring-2 ring-white"
                      : "h-12 rounded-lg bg-white/5 ring-1 ring-white/10 text-white/80 hover:bg-white/10"
                  }
                >
                  {n}
                </button>
              ))}
            </div>
            <label htmlFor="comment" className="block mt-6 text-sm text-white/70">
              Anything you want to share (optional)
            </label>
            <textarea
              id="comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-2 w-full bg-white/5 ring-1 ring-white/15 rounded-xl p-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400/60"
              placeholder="Anything you'd want us to know..."
            />
            <button onClick={submit} disabled={score == null || pending}
              className="mt-5 btn bg-white text-ink-900 hover:bg-white/90 w-full justify-center disabled:opacity-50">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
