"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewResponderForm({ businessId, businessName }: { businessId: string; businessName: string }) {
  const router = useRouter();
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [tone, setTone] = useState("warm");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    setDraft("");
    try {
      const res = await fetch("/api/ai/review-response", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessId, reviewText, rating, tone, businessName }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { response: string };
      setDraft(data.response);
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div>
        <label className="label">Review text</label>
        <textarea
          rows={4}
          className="input"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Paste the customer's review here…"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Star rating</label>
          <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} star{n === 1 ? "" : "s"}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Tone</label>
          <select className="input" value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="warm">Warm</option>
            <option value="professional">Professional</option>
            <option value="apologetic">Apologetic</option>
            <option value="upbeat">Upbeat</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end">
        <button className="btn-primary" disabled={busy || !reviewText.trim()} onClick={generate}>
          {busy ? "Drafting…" : "Draft reply"}
        </button>
      </div>
      {err && <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">{err}</p>}
      {draft && (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">Suggested reply</div>
          <p className="mt-2 whitespace-pre-line text-sm text-slate-800">{draft}</p>
        </div>
      )}
    </div>
  );
}
