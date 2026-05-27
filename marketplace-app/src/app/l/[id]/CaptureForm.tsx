"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function CaptureForm({ userId, business }: { userId: string; business: string }) {
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
      service_type: String(fd.get("service_type") ?? "").trim() || null,
      notes: String(fd.get("notes") ?? "").trim() || null,
      website: String(fd.get("website") ?? ""),
    };

    try {
      const res = await fetch(`/api/public/capture/${userId}`, {
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
      <div className="mt-8 text-center space-y-3">
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h2 className="text-xl font-semibold">Thanks — we got it.</h2>
        <p className="text-sm text-slate-600">
          {business} will be in touch within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-7 space-y-4">
      {/* Honeypot — bots fill this, humans don't see it */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div>
        <label className="label" htmlFor="name">Your name</label>
        <input id="name" name="name" required className="input" autoComplete="name" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="service_type">What do you need done?</label>
        <input id="service_type" name="service_type" className="input"
          placeholder="Kitchen remodel, roof repair, deep clean…" />
      </div>
      <div>
        <label className="label" htmlFor="notes">Tell us a bit more (optional)</label>
        <textarea id="notes" name="notes" rows={3} className="input"
          placeholder="Timeline, budget, what you're looking for…" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button className="btn-primary w-full text-base py-3" disabled={loading}>
        {loading ? "Sending…" : "Get my free quote"}
      </button>
      <p className="text-xs text-slate-500 text-center">
        By submitting you agree to be contacted by {business}.
      </p>
    </form>
  );
}
