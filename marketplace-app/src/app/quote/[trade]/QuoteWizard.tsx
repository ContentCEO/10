"use client";

import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

interface TradeConfig {
  slug: string;
  label: string;
  serviceType: string;
  priceLow: number;
  priceHigh: number;
  questions: { id: string; label: string; options: string[] }[];
}

type Step = "questions" | "contact" | "done";

export function QuoteWizard({ trade, priceMid }: { trade: TradeConfig; priceMid: number }) {
  const [step, setStep] = useState<Step>("questions");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = trade.questions.every((q) => answers[q.id]);

  // Adjust the estimate by selections: higher complexity / size / finish nudges up.
  const estimate = useMemo(() => {
    let bump = 0;
    for (const v of Object.values(answers)) {
      const lower = v.toLowerCase();
      if (/(high-end|gut|whole|large|asap|emergency|2000\+|second story)/i.test(lower)) bump += 0.20;
      else if (/(mid-range|medium|full|3.5.bath|master|500–1000|within a month|within 2 weeks)/i.test(lower)) bump += 0.05;
      else if (/(standard|small|under|partial|some|not sure|whenever)/i.test(lower)) bump -= 0.05;
    }
    const center = priceMid * (1 + bump);
    const low  = Math.round(Math.max(trade.priceLow, center * 0.85) / 100) * 100;
    const high = Math.round(Math.min(trade.priceHigh, center * 1.15) / 100) * 100;
    return { low, high };
  }, [answers, priceMid, trade.priceLow, trade.priceHigh]);

  function setAnswer(id: string, v: string) {
    setAnswers((prev) => ({ ...prev, [id]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Please add your name.");
    if (phone.replace(/\D/g, "").length < 10) return setError("Please add a 10-digit phone.");
    if (!zip.match(/^0[12]\d{3}/)) return setError("Please use a Massachusetts ZIP (01xxx or 02xxx).");

    setBusy(true);
    try {
      const detail = Object.entries(answers).map(([k, v]) => {
        const q = trade.questions.find((q) => q.id === k);
        return `${q?.label ?? k}: ${v}`;
      }).join(" · ");

      const res = await fetch("/api/marketplace/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          city:  city.trim()  || null,
          zip:   zip.trim()   || null,
          service_type: trade.serviceType,
          notes: [detail, notes.trim()].filter(Boolean).join("\n\n"),
          budget:   estimate.high >= 50_000 ? "over_50k" : estimate.high >= 15_000 ? "15k_50k" : estimate.high >= 5_000 ? "5k_15k" : "under_5k",
          timeline: "asap",
          consent_text: "By submitting, you agree to be contacted by ContractorFlow about this project via phone, SMS, or email.",
          consent_url: typeof window !== "undefined" ? window.location.href : null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as { error?: string }).error ?? `HTTP ${res.status}`);
        setBusy(false);
        return;
      }
      // Redirect to the dedicated thanks page so submissions can be
      // analytics-tracked separately from the form page.
      if (typeof window !== "undefined") {
        const q = new URLSearchParams({ name: name.trim() }).toString();
        window.location.href = `/quote/thanks?${q}`;
        return;
      }
      setStep("done");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <div className="rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-400/30 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
        <h2 className="mt-4 font-serif text-3xl text-white">You&apos;re all set, {name.split(" ")[0]}.</h2>
        <p className="mt-2 text-white/70">A licensed Massachusetts contractor will text or call you within one business day at {phone}.</p>
        <p className="mt-4 text-sm text-white/50">
          Your project estimate: <span className="text-white font-semibold tabular-nums">${estimate.low.toLocaleString()}–${estimate.high.toLocaleString()}</span>
        </p>
      </div>
    );
  }

  if (step === "questions") {
    return (
      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5 sm:p-6 space-y-5">
        {trade.questions.map((q) => (
          <div key={q.id}>
            <div className="text-sm font-semibold text-white/90">{q.label}</div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt) => {
                const active = answers[q.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer(q.id, opt)}
                    className={active
                      ? "rounded-xl bg-brand-500/20 ring-1 ring-brand-400/60 text-white px-3 py-2.5 text-sm text-left"
                      : "rounded-xl bg-white/[0.03] ring-1 ring-white/10 text-white/80 hover:bg-white/[0.06] hover:ring-white/20 px-3 py-2.5 text-sm text-left transition"}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {allAnswered && (
          <div className="rounded-xl bg-brand-500/[0.08] ring-1 ring-brand-400/30 p-4">
            <div className="text-[10px] uppercase tracking-wider text-brand-200 font-mono">Estimated cost range</div>
            <div className="mt-1 text-3xl font-bold text-white tabular-nums">
              ${estimate.low.toLocaleString()}–${estimate.high.toLocaleString()}
            </div>
            <div className="mt-1 text-xs text-white/60">Get an exact number — share your contact below.</div>
          </div>
        )}

        <button
          type="button"
          disabled={!allAnswered}
          onClick={() => setStep("contact")}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 text-white font-semibold px-4 py-3 text-sm hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          See my real quote <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-5 sm:p-6 space-y-4">
      <div className="rounded-xl bg-brand-500/[0.08] ring-1 ring-brand-400/30 p-3">
        <div className="text-[10px] uppercase tracking-wider text-brand-200 font-mono">Your estimate</div>
        <div className="mt-0.5 text-2xl font-bold text-white tabular-nums">
          ${estimate.low.toLocaleString()}–${estimate.high.toLocaleString()}
        </div>
        <div className="text-xs text-white/50 mt-1">A contractor will refine this after a free consultation.</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium text-white/70 mb-1 block">Your name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus autoComplete="name"
            className="w-full rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400/60 focus:outline-none" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-white/70 mb-1 block">Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" inputMode="tel" autoComplete="tel"
            placeholder="(555) 123-4567"
            className="w-full rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400/60 focus:outline-none" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-white/70 mb-1 block">Email (optional)</span>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email"
            className="w-full rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400/60 focus:outline-none" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-white/70 mb-1 block">City</span>
          <input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2"
            placeholder="Cambridge"
            className="w-full rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400/60 focus:outline-none" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-white/70 mb-1 block">ZIP code</span>
          <input value={zip} onChange={(e) => setZip(e.target.value.slice(0, 5))} required pattern="0[12]\d{3}" autoComplete="postal-code"
            placeholder="02139"
            className="w-full rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400/60 focus:outline-none" />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-white/70 mb-1 block">Anything else? (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Timing, must-haves, must-avoids…"
            className="w-full rounded-xl bg-white/[0.04] ring-1 ring-inset ring-white/10 text-white placeholder:text-white/30 px-3 py-2.5 text-sm focus:ring-2 focus:ring-brand-400/60 focus:outline-none" />
        </label>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 text-white font-semibold px-4 py-3 text-sm hover:bg-brand-400 disabled:opacity-50 transition"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Get my free quote
      </button>

      <p className="text-[11px] text-white/40 leading-relaxed">
        By submitting, you agree to be contacted by ContractorFlow about your project via phone, SMS, or email. Standard rates apply. Reply STOP to opt out at any time.
      </p>
    </form>
  );
}
