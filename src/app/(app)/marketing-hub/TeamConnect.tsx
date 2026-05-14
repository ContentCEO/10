"use client";

import { useState } from "react";
import { Check, Loader2, Send } from "lucide-react";

const SERVICES_OFFERED = [
  { id: "sales_calls",      label: "Sales calls — handle inbound leads for me" },
  { id: "ads_setup",        label: "Run my paid ads (Google + Meta)" },
  { id: "social_management",label: "Manage my social posts (IG/TikTok/FB)" },
  { id: "seo",              label: "SEO — rank my site on Google" },
  { id: "lsa_setup",        label: "Set up Google Local Service Ads for me" },
  { id: "content",          label: "Content shoots (video + photo for posts)" },
  { id: "branding",         label: "Logo + brand identity" },
  { id: "website",          label: "Build me a website" },
];

export function TeamConnect() {
  const [needs, setNeeds] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setNeeds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/team-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needs, budget, phone, notes }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="card p-7 text-center">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-glow">
          <Check className="h-7 w-7" />
        </div>
        <h3 className="mt-4 display-h2 text-3xl">Got it.</h3>
        <p className="mt-2 lede max-w-md mx-auto">
          A member of our team will reach out within 24 hours. Keep an eye on
          your phone and the email tied to your account.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4">
      <div>
        <label className="label">What do you need help with? (pick any)</label>
        <div className="mt-2 grid sm:grid-cols-2 gap-2">
          {SERVICES_OFFERED.map((s) => {
            const on = needs.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className={`text-left rounded-xl border px-3.5 py-2.5 text-sm transition ${
                  on
                    ? "border-brand-500 bg-brand-50 text-brand-700 shadow-soft"
                    : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
                }`}
              >
                {on && <Check className="h-3.5 w-3.5 inline mr-1.5" />}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Monthly budget</label>
          <select className="input !py-2.5" value={budget} onChange={(e) => setBudget(e.target.value)}>
            <option value="">Select…</option>
            <option value="under_500">Under $500</option>
            <option value="500_1500">$500 — $1,500</option>
            <option value="1500_5000">$1,500 — $5,000</option>
            <option value="5000_plus">$5,000+</option>
            <option value="not_sure">Not sure yet</option>
          </select>
        </div>
        <div>
          <label className="label">Best phone</label>
          <input className="input !py-2.5" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" type="tel" />
        </div>
      </div>

      <div>
        <label className="label">Anything else? (optional)</label>
        <textarea className="input min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Tell us about your business, goals, what's worked / what hasn't…" />
      </div>

      <button onClick={submit} disabled={submitting || needs.length === 0} className="btn-primary">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Send to our team
      </button>
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}
