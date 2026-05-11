"use client";

import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export function PlansGrid() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(planId: string) {
    setLoading(planId);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout-tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data?.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(null);
    }
  }

  return (
    <section>
      <div className="grid sm:grid-cols-3 gap-4">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={cn(
              "card p-6 flex flex-col relative",
              p.highlight && "ring-2 ring-brand-500 shadow-glow",
            )}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-brand-gradient text-white ring-transparent">
                <Sparkles className="h-3 w-3 mr-1" /> {p.highlight}
              </span>
            )}
            <div>
              <h3 className="text-xl font-bold">{p.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold gradient-text">${p.monthlyCents / 100}</span>
                <span className="text-slate-500 text-sm">/ month</span>
              </div>
            </div>
            <ul className="mt-5 space-y-2 text-sm flex-1">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => pick(p.id)}
              disabled={loading !== null}
              className={cn(
                "mt-6 w-full",
                p.highlight ? "btn-primary" : "btn-secondary",
              )}
            >
              {loading === p.id ? "Opening checkout…" : `Start ${p.name}`}
            </button>
          </div>
        ))}
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
