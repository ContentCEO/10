"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, MapPin, Sparkles, Wrench, X } from "lucide-react";

const POPULAR_SERVICES = [
  "Roofing",
  "Painting",
  "Kitchen remodel",
  "Bathroom remodel",
  "Plumbing",
  "Electrical",
  "HVAC",
  "Flooring",
  "Landscaping",
  "Tree service",
  "Pressure washing",
  "Window cleaning",
  "General handyman",
  "Drywall",
  "Concrete / masonry",
  "Fence install",
  "Deck building",
  "Snow removal",
];

interface Props {
  userId: string;
  initialBusinessName: string | null;
  alreadyOnboarded: boolean;
}

const SKIP_KEY = (uid: string) => `cf-welcome-skipped-${uid}`;

export function WelcomeWizard({ userId, initialBusinessName, alreadyOnboarded }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState(initialBusinessName ?? "");
  const [headline, setHeadline] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [customService, setCustomService] = useState("");
  const [zips, setZips] = useState("");
  const [cities, setCities] = useState("");

  useEffect(() => {
    if (alreadyOnboarded) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(SKIP_KEY(userId))) return;
    setOpen(true);
  }, [userId, alreadyOnboarded]);

  function toggleService(s: string) {
    setServices((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function addCustomService() {
    const t = customService.trim();
    if (t && !services.includes(t)) setServices((prev) => [...prev, t]);
    setCustomService("");
  }

  function skip() {
    localStorage.setItem(SKIP_KEY(userId), String(Date.now()));
    setOpen(false);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: businessName.trim() || null,
          headline: headline.trim() || null,
          services,
          service_zips: zips.split(",").map((z) => z.trim()).filter(Boolean),
          service_cities: cities.split(",").map((c) => c.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Save failed (${res.status})`);
      }
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const canNext0 = businessName.trim().length >= 2;
  const canNext1 = services.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fade-up">
      <div className="card max-w-lg w-full p-7 sm:p-8 relative shadow-soft-lg">
        <button
          onClick={skip}
          aria-label="Close"
          className="absolute top-4 right-4 text-ink-400 hover:text-ink-700 transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "bg-brand-gradient w-8" : i < step ? "bg-brand-500 w-4" : "bg-ink-200 w-4"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div>
            <span className="section-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Welcome</span>
            <h2 className="mt-2 display-h2">
              Let&apos;s get you set up in <span className="gradient-text">90 seconds</span>
            </h2>
            <p className="mt-3 lede">
              Three quick questions and your CRM is personalized to your business.
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="label">Business name *</label>
                <input
                  className="input"
                  placeholder="Reliable Roofing LLC"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">One-line headline <span className="text-ink-400">(optional)</span></label>
                <input
                  className="input"
                  placeholder="Trusted roofing since 2008"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-7 flex items-center justify-between gap-2">
              <button onClick={skip} className="btn-ghost text-sm">Skip for now</button>
              <button
                onClick={() => setStep(1)}
                disabled={!canNext0}
                className="btn-primary"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <span className="section-eyebrow"><Wrench className="h-3.5 w-3.5" /> Services</span>
            <h2 className="mt-2 display-h2">What do you do?</h2>
            <p className="mt-3 lede">
              Pick everything that applies — we&apos;ll match leads to your skills.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 max-h-64 overflow-y-auto scrollbar-thin">
              {POPULAR_SERVICES.map((s) => {
                const on = services.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleService(s)}
                    className={`badge text-sm px-3 py-1.5 transition ${
                      on
                        ? "bg-brand-gradient text-white ring-transparent shadow-glow"
                        : "bg-white text-ink-700 ring-ink-200 hover:border-brand-300 hover:bg-brand-50"
                    }`}
                  >
                    {on && <Check className="h-3 w-3 mr-1" />}
                    {s}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className="input flex-1"
                placeholder="Add a custom service…"
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomService(); } }}
              />
              <button type="button" onClick={addCustomService} className="btn-secondary">Add</button>
            </div>
            <div className="mt-7 flex items-center justify-between gap-2">
              <button onClick={() => setStep(0)} className="btn-ghost text-sm">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canNext1}
                className="btn-primary"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <span className="section-eyebrow"><MapPin className="h-3.5 w-3.5" /> Service area</span>
            <h2 className="mt-2 display-h2">Where do you work?</h2>
            <p className="mt-3 lede">
              Even one ZIP is fine. You can edit this anytime in your profile.
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="label">ZIP codes</label>
                <input
                  className="input"
                  placeholder="02118, 02119, 02120"
                  value={zips}
                  onChange={(e) => setZips(e.target.value)}
                  inputMode="numeric"
                />
                <p className="text-xs text-ink-500 mt-1">Comma-separated</p>
              </div>
              <div>
                <label className="label">Cities <span className="text-ink-400">(optional)</span></label>
                <input
                  className="input"
                  placeholder="Boston, Cambridge, Somerville"
                  value={cities}
                  onChange={(e) => setCities(e.target.value)}
                />
              </div>
            </div>
            {error && (
              <p className="mt-3 text-sm text-rose-600">{error}</p>
            )}
            <div className="mt-7 flex items-center justify-between gap-2">
              <button onClick={() => setStep(1)} className="btn-ghost text-sm">
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button onClick={submit} disabled={submitting} className="btn-primary">
                {submitting ? "Saving…" : (<>Finish <Check className="h-4 w-4" /></>)}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-2">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow animate-pulse-soft">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="mt-5 display-h2">
              You&apos;re <span className="gradient-text">all set</span>
            </h2>
            <p className="mt-3 lede">
              Your profile is live. Next: add your first lead or top up your
              marketplace wallet to start claiming inventory.
            </p>
            <div className="mt-7 flex items-center justify-center gap-2">
              <a href="/onboarding" className="btn-secondary">See checklist</a>
              <button onClick={() => setOpen(false)} className="btn-primary">
                Go to dashboard <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
