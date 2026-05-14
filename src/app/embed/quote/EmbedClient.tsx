"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";

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

export function EmbedClient({ partnerToken }: { partnerToken: string | null }) {
  const [service, setService] = useState("Kitchen remodel");
  const [details, setDetails] = useState("");
  const [city, setCity] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"form" | "result" | "claim">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function estimate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_type: service, details, city }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not estimate");
      setResult(body as Result);
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function captureLead(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, phone, email,
          city,
          service_type: service,
          notes: details,
          partner_token: partnerToken,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? "Could not submit");
      setStep("claim");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (step === "claim") {
    return (
      <div className="card p-6 text-center space-y-2">
        <h2 className="text-lg font-bold">You're matched ✅</h2>
        <p className="text-sm text-slate-600">A local pro will reach out within 24 hours.</p>
      </div>
    );
  }

  if (step === "result" && result) {
    return (
      <div className="space-y-4">
        <div className="card p-5">
          <div className="text-xs uppercase tracking-wider text-slate-500">Estimated range</div>
          <div className="mt-1 text-3xl font-bold gradient-text">
            {money(result.low)} – {money(result.high)}
          </div>
          {result.summary && <p className="mt-2 text-sm text-slate-700">{result.summary}</p>}
        </div>
        <form onSubmit={captureLead} className="card p-5 space-y-3">
          <h2 className="font-semibold">Get matched with a real pro</h2>
          <input className="input" placeholder="Your name" required
            value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" placeholder="Phone" type="tel"
              value={phone} onChange={(e) => setPhone(e.target.value)} />
            <input className="input" placeholder="Email" type="email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Sending…" : "Get matched"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={estimate} className="card p-5 space-y-4">
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
        <textarea id="details" rows={3} className="input"
          value={details} onChange={(e) => setDetails(e.target.value)} />
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>
        <Sparkles className="h-4 w-4" />
        {loading ? "Calculating…" : "Get my estimate"}
      </button>
    </form>
  );
}
