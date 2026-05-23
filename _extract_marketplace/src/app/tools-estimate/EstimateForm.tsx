"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

// Service pricing model — rough regional averages for MA / Northeast.
// Each service: a base price + per-unit multiplier + size buckets.
// Numbers are conservative; we always present a range, not a point estimate.

interface ServiceModel {
  id: string;
  label: string;
  unit: "sqft" | "linear_ft" | "fixtures" | "rooms" | "panels";
  unit_label: string;
  base: number;
  per_unit: { low: number; high: number };
  defaults: { size: number };
  qualifiers: { id: string; label: string; multiplier: number }[];
}

const SERVICES: ServiceModel[] = [
  {
    id: "bath_remodel",
    label: "Bathroom remodel",
    unit: "sqft",
    unit_label: "sqft",
    base: 3000,
    per_unit: { low: 250, high: 600 },
    defaults: { size: 50 },
    qualifiers: [
      { id: "basic",   label: "Basic refresh (paint, vanity, fixtures)",  multiplier: 0.6 },
      { id: "mid",     label: "Mid-range (new tile, tub, vanity)",       multiplier: 1.0 },
      { id: "luxury",  label: "Full gut · luxury finishes",               multiplier: 1.6 },
    ],
  },
  {
    id: "kitchen_remodel",
    label: "Kitchen remodel",
    unit: "sqft",
    unit_label: "sqft",
    base: 8000,
    per_unit: { low: 350, high: 900 },
    defaults: { size: 150 },
    qualifiers: [
      { id: "basic",   label: "Cabinet refresh + new counters",           multiplier: 0.55 },
      { id: "mid",     label: "Mid-range full replacement",               multiplier: 1.0 },
      { id: "luxury",  label: "Custom cabinets + appliance upgrade",      multiplier: 1.7 },
    ],
  },
  {
    id: "roof_replace",
    label: "Roof replacement",
    unit: "sqft",
    unit_label: "sqft of roof",
    base: 2000,
    per_unit: { low: 4.5, high: 11 },
    defaults: { size: 1800 },
    qualifiers: [
      { id: "asphalt", label: "Architectural asphalt shingles",            multiplier: 1.0 },
      { id: "metal",   label: "Standing-seam metal",                       multiplier: 2.2 },
      { id: "slate",   label: "Natural slate",                             multiplier: 3.5 },
    ],
  },
  {
    id: "deck_build",
    label: "Deck build",
    unit: "sqft",
    unit_label: "sqft of deck",
    base: 1500,
    per_unit: { low: 30, high: 75 },
    defaults: { size: 250 },
    qualifiers: [
      { id: "pressure", label: "Pressure-treated lumber",                  multiplier: 1.0 },
      { id: "cedar",    label: "Cedar / hardwood",                         multiplier: 1.5 },
      { id: "composite",label: "Composite (Trex / TimberTech)",           multiplier: 2.0 },
    ],
  },
  {
    id: "fence_install",
    label: "Fence install",
    unit: "linear_ft",
    unit_label: "linear feet",
    base: 800,
    per_unit: { low: 18, high: 60 },
    defaults: { size: 150 },
    qualifiers: [
      { id: "chain",   label: "Chain link",                                multiplier: 0.6 },
      { id: "wood",    label: "Wood (cedar / pine)",                       multiplier: 1.0 },
      { id: "vinyl",   label: "Vinyl",                                     multiplier: 1.3 },
      { id: "iron",    label: "Wrought iron",                              multiplier: 2.2 },
    ],
  },
  {
    id: "interior_paint",
    label: "Interior painting",
    unit: "rooms",
    unit_label: "rooms",
    base: 300,
    per_unit: { low: 350, high: 900 },
    defaults: { size: 4 },
    qualifiers: [
      { id: "basic",   label: "Walls only",                                multiplier: 0.8 },
      { id: "full",    label: "Walls + trim + ceilings",                   multiplier: 1.0 },
      { id: "prep",    label: "Includes patching + heavy prep",           multiplier: 1.4 },
    ],
  },
  {
    id: "panel_upgrade",
    label: "Electrical panel upgrade",
    unit: "panels",
    unit_label: "panel",
    base: 1800,
    per_unit: { low: 200, high: 700 },
    defaults: { size: 1 },
    qualifiers: [
      { id: "100amp",  label: "100 amp",                                   multiplier: 0.85 },
      { id: "200amp",  label: "200 amp",                                   multiplier: 1.0 },
      { id: "400amp",  label: "400 amp / sub-panel",                      multiplier: 1.8 },
    ],
  },
  {
    id: "hvac_install",
    label: "Central AC install",
    unit: "fixtures",
    unit_label: "unit",
    base: 4500,
    per_unit: { low: 500, high: 2000 },
    defaults: { size: 1 },
    qualifiers: [
      { id: "ducted",   label: "Ducted central AC",                        multiplier: 1.0 },
      { id: "ductless", label: "Ductless mini-split (per zone)",          multiplier: 0.7 },
      { id: "heatpump", label: "Heat pump (heat + cool)",                  multiplier: 1.3 },
    ],
  },
];

export function EstimateForm() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [serviceId, setServiceId] = useState<string>("");
  const [qualifier, setQualifier] = useState<string>("");
  const [size, setSize] = useState<number>(0);
  const [zip, setZip] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, startTransition] = useTransition();

  const service = useMemo(() => SERVICES.find((s) => s.id === serviceId), [serviceId]);
  const q = useMemo(() => service?.qualifiers.find((q) => q.id === qualifier), [service, qualifier]);

  const range = useMemo(() => {
    if (!service || !q || !size) return null;
    const low  = Math.round((service.base + service.per_unit.low  * size) * q.multiplier / 100) * 100;
    const high = Math.round((service.base + service.per_unit.high * size) * q.multiplier / 100) * 100;
    return { low, high };
  }, [service, q, size]);

  function pickService(id: string) {
    const svc = SERVICES.find((s) => s.id === id);
    if (!svc) return;
    setServiceId(id);
    setQualifier(svc.qualifiers[1]?.id ?? svc.qualifiers[0].id);
    setSize(svc.defaults.size);
    setStep(2);
  }

  function submit() {
    if (!service || !range) return;
    startTransition(async () => {
      try {
        await fetch("/api/marketplace/intake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: email || phone || "Estimate calculator",
            email: email || null,
            phone: phone || null,
            zip: zip || null,
            service_type: service.label,
            notes:
              `Source: public estimate calculator\n` +
              `Type: ${q?.label}\n` +
              `Size: ${size} ${service.unit_label}\n` +
              `Estimated range: $${range.low.toLocaleString()} – $${range.high.toLocaleString()}`,
            budget: "5k_15k",
            timeline: "flexible",
            source_channel: "marketplace_form",
            external_id: `est:${Date.now()}:${(email || phone || "anon").slice(0, 40)}`,
          }),
        });
      } catch { /* */ }
      setSubmitted(true);
      setStep(4);
    });
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-2xl font-bold">You&apos;re in.</h2>
        <p className="mt-2 text-white/65">
          A local pro will reach out within 24h with a real quote. We&apos;ll send your ballpark
          to <strong>{email || phone}</strong> for your records.
        </p>
        <div className="mt-6 inline-flex flex-col items-start gap-2 rounded-xl bg-white/[0.04] ring-1 ring-white/10 p-5 text-left">
          <div className="text-xs uppercase tracking-wider text-brand-300 font-mono">Your range</div>
          <div className="text-3xl font-bold tabular-nums">
            ${range?.low.toLocaleString()} – ${range?.high.toLocaleString()}
          </div>
          <div className="text-xs text-white/50">{service?.label} · {q?.label} · {size} {service?.unit_label}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((n) => (
          <div key={n} className={
            step >= n
              ? "flex-1 h-1 rounded-full bg-brand-gradient"
              : "flex-1 h-1 rounded-full bg-white/10"
          } />
        ))}
      </div>

      {step === 1 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">What are you planning?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SERVICES.map((s) => (
              <button
                key={s.id}
                onClick={() => pickService(s.id)}
                className="p-4 rounded-xl bg-white/[0.04] ring-1 ring-white/10 hover:bg-white/[0.08] hover:ring-white/25 text-left transition"
              >
                <div className="font-semibold">{s.label}</div>
                <div className="text-xs text-white/50 mt-0.5">Avg starts at ${s.base.toLocaleString()}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && service && (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold">Refine your {service.label}</h2>
          <div>
            <div className="text-sm text-white/70 mb-2">Quality tier</div>
            <div className="space-y-2">
              {service.qualifiers.map((opt) => (
                <label
                  key={opt.id}
                  className={
                    qualifier === opt.id
                      ? "block p-3 rounded-xl ring-2 ring-brand-400 bg-brand-500/10 cursor-pointer"
                      : "block p-3 rounded-xl ring-1 ring-white/10 bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer"
                  }
                >
                  <input type="radio" name="qualifier" value={opt.id} checked={qualifier === opt.id} onChange={() => setQualifier(opt.id)} className="sr-only" />
                  <div className="font-medium text-sm">{opt.label}</div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm text-white/70 block mb-2" htmlFor="size">
              How many {service.unit_label}? <span className="text-white font-semibold tabular-nums">{size}</span>
            </label>
            <input
              id="size"
              type="range"
              min={1}
              max={service.defaults.size * 4}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-indigo-400"
            />
          </div>
          {range && (
            <div className="rounded-xl bg-gradient-to-br from-indigo-500/20 to-fuchsia-500/20 ring-1 ring-brand-400/40 p-5">
              <div className="text-xs uppercase tracking-wider text-brand-200 font-mono">Estimated range</div>
              <div className="mt-1 text-3xl font-bold tabular-nums">
                ${range.low.toLocaleString()} – ${range.high.toLocaleString()}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="btn bg-white/10 text-white border border-white/15 hover:bg-white/20">Back</button>
            <button onClick={() => setStep(3)} className="btn bg-white text-ink-900 hover:bg-white/90 flex-1 justify-center">
              Get a real quote <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Where should we send it?</h2>
          <p className="text-sm text-white/60">A local pro will reach out within 24h.</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-white/70 block mb-1" htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400/60"
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="text-sm text-white/70 block mb-1" htmlFor="phone">Phone (optional)</label>
              <input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400/60"
                placeholder="(617) 555-0100" />
            </div>
            <div>
              <label className="text-sm text-white/70 block mb-1" htmlFor="zip">ZIP code</label>
              <input id="zip" type="text" value={zip} onChange={(e) => setZip(e.target.value)}
                className="w-full bg-white/5 ring-1 ring-white/15 rounded-xl px-3 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400/60"
                placeholder="02445" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="btn bg-white/10 text-white border border-white/15 hover:bg-white/20">Back</button>
            <button onClick={submit} disabled={(!email && !phone) || pending}
              className="btn bg-white text-ink-900 hover:bg-white/90 flex-1 justify-center disabled:opacity-50">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Send my quote
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
