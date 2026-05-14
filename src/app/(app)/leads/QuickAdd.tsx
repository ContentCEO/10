"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wand2 } from "lucide-react";

export function QuickAdd() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/parse-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not create lead");
      setText("");
      router.push(`/leads/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card p-4 sm:p-5 space-y-3 relative overflow-hidden">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
      <div className="relative flex items-center gap-2 text-sm font-medium">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-gradient text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        AI quick-add
        <span className="badge bg-brand-50 text-brand-700 ring-brand-200 ml-auto">Claude</span>
      </div>
      <div className="relative flex flex-col sm:flex-row gap-2">
        <input
          className="input"
          placeholder='e.g. "John Smith 555-1234 kitchen remodel $5k from Google"'
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
        />
        <button className="btn-primary shrink-0" disabled={loading || !text.trim()}>
          <Wand2 className="h-4 w-4" />
          {loading ? "Parsing…" : "Add lead"}
        </button>
      </div>
      {error && <p className="relative text-sm text-red-600">{error}</p>}
    </form>
  );
}
