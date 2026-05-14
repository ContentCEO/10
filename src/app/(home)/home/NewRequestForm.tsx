"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { BUDGET_LABELS, TIMELINE_LABELS } from "@/lib/marketplace";

export function NewRequestForm({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter();
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
    };

    try {
      const res = await fetch("/api/marketplace/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not submit");
      setSubmitted(true);
      form.reset();
      router.refresh();
      setTimeout(() => setSubmitted(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <div>
        <label className="label" htmlFor="service_type">Project</label>
        <input id="service_type" name="service_type" required className="input"
          placeholder="Kitchen remodel, roof repair, deep clean…" />
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input id="name" name="name" required className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" type="tel" className="input" autoComplete="tel" />
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required
            autoComplete="email" defaultValue={defaultEmail} />
        </div>
        <div>
          <label className="label" htmlFor="zip">ZIP</label>
          <input id="zip" name="zip" className="input" inputMode="numeric"
            autoComplete="postal-code" />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="budget">Budget</label>
          <select id="budget" name="budget" className="input" defaultValue="unsure">
            {Object.entries(BUDGET_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="timeline">Timeline</label>
          <select id="timeline" name="timeline" className="input" defaultValue="flexible">
            {Object.entries(TIMELINE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="notes">Details (optional)</label>
        <textarea id="notes" name="notes" rows={3} className="input" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {submitted && (
        <p className="text-sm text-emerald-700 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          Submitted! We'll match you with pros shortly.
        </p>
      )}

      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Submitting…" : "Get matched with pros"}
      </button>
    </form>
  );
}
