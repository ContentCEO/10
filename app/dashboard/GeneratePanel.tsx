"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentType } from "@/lib/types";
import { CONTENT_TYPE_LABELS } from "@/lib/types";

const SINGLE_TYPES: ContentType[] = [
  "instagram_caption",
  "reel_idea",
  "before_after",
  "promo",
  "hashtags",
  "image_prompt",
];

export default function GeneratePanel({ businessName }: { businessName: string }) {
  const router = useRouter();
  const [type, setType] = useState<ContentType>("instagram_caption");
  const [topic, setTopic] = useState("");
  const [singleResult, setSingleResult] = useState<string | null>(null);
  const [singleLoading, setSingleLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchMsg, setBatchMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateSingle() {
    setError(null);
    setSingleResult(null);
    setSingleLoading(true);
    try {
      const r = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, topic, save: true }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Generation failed");
      setSingleResult(data.body);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSingleLoading(false);
    }
  }

  async function generateMonth() {
    setError(null);
    setBatchMsg(null);
    setBatchLoading(true);
    try {
      const r = await fetch("/api/generate-month", { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Batch failed");
      setBatchMsg(`Saved ${data.created} posts to your calendar.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBatchLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">30 days for {businessName}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Generates a varied calendar — captions, Reels, before-and-afters, promos, image
              prompts — and schedules them across the next 30 days as drafts.
            </p>
          </div>
          <button
            className="btn-primary text-base px-5 py-3"
            onClick={generateMonth}
            disabled={batchLoading}
          >
            {batchLoading ? "Generating month…" : "Generate 30 days"}
          </button>
        </div>
        {batchMsg && <p className="mt-3 text-sm text-emerald-700">{batchMsg}</p>}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Single post</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-[200px,1fr,auto] items-end">
          <div>
            <label className="label">Type</label>
            <select className="input" value={type}
              onChange={(e) => setType(e.target.value as ContentType)}>
              {SINGLE_TYPES.map((t) => (
                <option key={t} value={t}>{CONTENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Topic / detail (optional)</label>
            <input className="input" value={topic}
              placeholder="e.g. summer special on whitening"
              onChange={(e) => setTopic(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={generateSingle} disabled={singleLoading}>
            {singleLoading ? "Generating…" : "Generate"}
          </button>
        </div>
        {singleResult && (
          <pre className="mt-5 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm">
            {singleResult}
          </pre>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
