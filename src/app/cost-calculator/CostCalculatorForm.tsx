"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

interface Result {
  low: number | null;
  high: number | null;
  summary: string;
  factors: string[];
  caveats: string[];
}

function money(n: number | null) {
  if (n == null) return "—";
  return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function CostCalculatorForm() {
  const [service, setService] = useState("Kitchen remodel");
  const [city, setCity] = useState("Boston, MA");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: service,
          details,
          city,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not estimate");
      setResult(body as Result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className="card p-5 space-y-4">
        <div>
          <label className="label" htmlFor="service">Project</label>
          <input id="service" required className="input"
            value={service} onChange={(e) => setService(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="city">City / region</label>
          <input id="city" className="input"
            value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="details">Project details</label>
          <textarea id="details" rows={4} className="input"
            placeholder="Square footage, current condition, materials you have in mind…"
            value={details} onChange={(e) => setDetails(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full text-base py-3" disabled={loading}>
          <Sparkles className="h-4 w-4" />
          {loading ? "Calculating…" : "Calculate cost"}
        </button>
      </form>

      {result && (
        <div className="mt-6 card p-6 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-500">Estimated range</div>
            <div className="mt-1 text-4xl font-bold gradient-text">
              {money(result.low)} – {money(result.high)}
            </div>
          </div>
          {result.summary && <p className="text-sm text-slate-700">{result.summary}</p>}
          {result.factors.length > 0 && (
            <div>
              <div className="font-semibold text-sm">What moves the price</div>
              <ul className="mt-1 list-disc list-inside text-sm text-slate-700 space-y-0.5">
                {result.factors.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
          )}
          {result.caveats.length > 0 && (
            <p className="text-xs text-slate-500">
              <strong>Note:</strong> {result.caveats.join(" · ")}
            </p>
          )}
          <Link href="/find-pro" className="btn-primary mt-2">
            Get a real quote from a pro <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </>
  );
}
