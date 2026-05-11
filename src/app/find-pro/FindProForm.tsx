"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { BUDGET_LABELS, TIMELINE_LABELS } from "@/lib/marketplace";

export function FindProForm() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim() || null,
      zip: String(fd.get("zip") ?? "").trim() || null,
      city: String(fd.get("city") ?? "").trim() || null,
      service_type: String(fd.get("service_type") ?? "").trim(),
      budget: String(fd.get("budget") ?? "unsure"),
      timeline: String(fd.get("timeline") ?? "flexible"),
      notes: String(fd.get("notes") ?? "").trim() || null,
      website: String(fd.get("website") ?? ""),
    };

    try {
      const res = await fetch("/api/marketplace/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Submission failed");
      setSubmitted(true);
      form.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-6 text-center space-y-3">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h3 className="text-lg font-semibold">You're matched.</h3>
        <p className="text-sm text-slate-600">
          A local pro will reach out within 24 hours. Check your email and phone.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-4">
      {/* Honeypot */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off"
        className="hidden" aria-hidden="true" />

      <div>
        <label className="label" htmlFor="service_type">What kind of project?</label>
        <input id="service_type" name="service_type" required className="input"
          placeholder="Kitchen remodel, roof repair, deep clean…" />
      </div>

      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" name="name" required className="input" autoComplete="name" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" />
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="city">City</label>
          <input id="city" name="city" className="input" autoComplete="address-level2" />
        </div>
        <div>
          <label className="label" htmlFor="zip">ZIP</label>
          <input id="zip" name="zip" className="input" autoComplete="postal-code"
            inputMode="numeric" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="budget">Estimated budget</label>
          <select id="budget" name="budget" className="input" defaultValue="unsure">
            {Object.entries(BUDGET_LABELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="timeline">When do you want it done?</label>
          <select id="timeline" name="timeline" className="input" defaultValue="flexible">
            {Object.entries(TIMELINE_LABELS).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Project details (optional)</label>
        <textarea id="notes" name="notes" rows={3} className="input"
          placeholder="Square footage, materials, anything pros should know…" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button className="btn-primary w-full text-base py-3" disabled={loading}>
        {loading ? "Matching you…" : "Get matched with pros"}
      </button>
      <p className="text-xs text-slate-500 text-center">
        By submitting you agree to be contacted by matched contractors.
      </p>
    </form>
  );
}
