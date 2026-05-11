"use client";

import { useState } from "react";
import { Check, Copy, Send, Sparkles, Star } from "lucide-react";

export function ReviewRequestPanel({
  jobId,
  customerName,
  serviceTitle,
  alreadySent,
}: {
  jobId: string;
  customerName: string | null;
  serviceTitle: string;
  alreadySent: string | null;
}) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sentTs, setSentTs] = useState<string | null>(alreadySent);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/review-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not generate message");
      setMessage(data.text ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function markSent() {
    const res = await fetch("/api/ai/review-request", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId }),
    });
    if (res.ok) setSentTs(new Date().toISOString());
  }

  async function copy() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    if (!sentTs) markSent();
  }

  return (
    <section className="card p-5 space-y-4 relative overflow-hidden">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
      <div className="relative flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-glow">
          <Star className="h-4 w-4" />
        </span>
        <h2 className="font-semibold">Ask for a review</h2>
        {sentTs && (
          <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200 ml-auto">
            <Check className="h-3 w-3 mr-1" /> Sent
          </span>
        )}
      </div>

      <p className="text-sm text-slate-600">
        Job's complete — perfect time to ask {customerName ?? "the customer"} for a Google review.
        Industry data: requests sent within 48 hours of completion convert ~3× better.
      </p>

      {!message && (
        <button onClick={generate} disabled={loading} className="btn-primary">
          <Sparkles className="h-4 w-4" />
          {loading ? "Drafting…" : "Draft a request"}
        </button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {message && (
        <div className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <pre className="whitespace-pre-wrap text-sm text-slate-800 font-sans">{message}</pre>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copy} className="btn-primary">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied — paste it into SMS" : "Copy & mark sent"}
            </button>
            <button onClick={generate} disabled={loading} className="btn-secondary">
              <Sparkles className="h-4 w-4" /> Try again
            </button>
            <a
              href={`sms:?body=${encodeURIComponent(message)}`}
              onClick={() => !sentTs && markSent()}
              className="btn-secondary"
            >
              <Send className="h-4 w-4" /> Send via SMS
            </a>
          </div>
          <p className="text-xs text-slate-500">
            Tip: set your Google review URL on the <strong>My Profile</strong> page so it's
            included automatically.
          </p>
        </div>
      )}
    </section>
  );
}
