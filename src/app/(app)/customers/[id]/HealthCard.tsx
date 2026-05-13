"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2 } from "lucide-react";

interface Health {
  total: number;
  tier: "champion" | "healthy" | "at-risk" | "lost";
  components: {
    recency:   { value: number; max: number };
    frequency: { value: number; max: number };
    payment:   { value: number; max: number };
    nps:       { value: number; max: number; last: number | null };
  };
  metadata: {
    completed_jobs: number;
    jobs_last_12mo: number;
    paid_invoices: number;
    on_time_invoices: number;
  };
}

const TIER_TONE: Record<Health["tier"], string> = {
  champion:  "bg-emerald-100 text-emerald-800 ring-emerald-200",
  healthy:   "bg-brand-100 text-brand-800 ring-brand-200",
  "at-risk": "bg-amber-100 text-amber-800 ring-amber-200",
  lost:      "bg-rose-100 text-rose-800 ring-rose-200",
};

export function HealthCard({ customerId }: { customerId: string }) {
  const [h, setH] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/customers/${customerId}/health`)
      .then((r) => r.json())
      .then((j: { ok: boolean } & Health) => {
        if (j.ok) setH(j);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return (
      <section className="card p-4 text-center text-ink-400">
        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
      </section>
    );
  }
  if (!h) return null;

  const Bar = ({ label, v, max }: { label: string; v: number; max: number }) => (
    <div>
      <div className="flex items-baseline justify-between text-[10px] mb-0.5">
        <span className="uppercase tracking-wider text-ink-500 font-semibold">{label}</span>
        <span className="tabular-nums font-mono text-ink-600">{v}/{max}</span>
      </div>
      <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
        <div className="h-full bg-brand-gradient" style={{ width: `${(v / max) * 100}%` }} />
      </div>
    </div>
  );

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-brand-600" />
          <h2 className="text-sm font-semibold">Health score</h2>
        </div>
        <span className={`badge ${TIER_TONE[h.tier]} uppercase tracking-wider`}>{h.tier}</span>
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-4xl font-mono tabular-nums font-semibold text-ink-900">{h.total}</span>
        <span className="text-xs text-ink-500">/ 100</span>
      </div>
      <div className="space-y-2">
        <Bar label="Recency"   v={h.components.recency.value}   max={h.components.recency.max} />
        <Bar label="Frequency" v={h.components.frequency.value} max={h.components.frequency.max} />
        <Bar label="Pays on time" v={h.components.payment.value} max={h.components.payment.max} />
        <Bar label={`NPS${h.components.nps.last != null ? ` (${h.components.nps.last})` : ""}`}
             v={h.components.nps.value} max={h.components.nps.max} />
      </div>
      <div className="mt-3 text-[10px] text-ink-500 font-mono">
        {h.metadata.completed_jobs} completed · {h.metadata.jobs_last_12mo} in 12mo · {h.metadata.on_time_invoices}/{h.metadata.paid_invoices} invoices on-time
      </div>
    </section>
  );
}
