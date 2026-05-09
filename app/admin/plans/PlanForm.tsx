"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function PlanForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stripePriceId, setStripePriceId] = useState("");
  const [visits, setVisits] = useState("4");
  const [features, setFeatures] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          price_cents: Math.round(Number(price) * 100),
          stripe_price_id: stripePriceId || null,
          visits_per_year: Number(visits) || 0,
          features: features.split("\n").map((s) => s.trim()).filter(Boolean)
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Could not create plan.");
        return;
      }
      setName(""); setDescription(""); setPrice(""); setStripePriceId(""); setVisits("4"); setFeatures("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Name</label>
        <input className="input" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Monthly price (USD)</label>
        <input className="input" required type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Description</label>
        <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div>
        <label className="label">Visits per year</label>
        <input className="input" type="number" min="0" value={visits} onChange={(e) => setVisits(e.target.value)} />
      </div>
      <div>
        <label className="label">Stripe price ID</label>
        <input className="input font-mono text-xs" placeholder="price_..." value={stripePriceId} onChange={(e) => setStripePriceId(e.target.value)} />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Features (one per line)</label>
        <textarea className="textarea" rows={3} value={features} onChange={(e) => setFeatures(e.target.value)} />
      </div>
      {error && <p className="text-sm text-rose-700 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create plan"}
        </button>
      </div>
    </form>
  );
}
