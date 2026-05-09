"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";
import type { Plan } from "@/lib/supabase/types";

export default function MembershipPlanCard({ plan, current }: { plan: Plan; current: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not start checkout.");
      window.location.href = json.url;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className={`card flex flex-col p-6 ${current ? "ring-2 ring-brand-500" : ""}`}>
      <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
      <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
      <div className="mt-4 text-3xl font-bold text-slate-900">
        {formatCurrency(plan.price_cents)}
        <span className="text-base font-normal text-slate-500">/mo</span>
      </div>
      <ul className="mt-4 flex-1 space-y-1 text-sm text-slate-700">
        {(plan.features ?? []).map((f, i) => (
          <li key={i}>• {f}</li>
        ))}
      </ul>
      {current ? (
        <div className="btn-secondary mt-6 w-full cursor-default">Current plan</div>
      ) : (
        <button className="btn-primary mt-6 w-full" onClick={subscribe} disabled={loading}>
          {loading ? "Loading…" : "Subscribe"}
        </button>
      )}
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
