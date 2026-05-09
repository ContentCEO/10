"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OnboardingForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    const res = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Failed to save business");
      setLoading(false);
      return;
    }
    router.push("/generator");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Business name</label>
        <input id="name" name="name" required className="input" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="industry">Industry</label>
          <input id="industry" name="industry" placeholder="e.g. SaaS, fitness, e-commerce" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="website">Website</label>
          <input id="website" name="website" type="url" placeholder="https://" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="description">What does your business do?</label>
        <textarea id="description" name="description" rows={3} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="target_audience">Target audience</label>
        <textarea
          id="target_audience"
          name="target_audience"
          rows={2}
          placeholder="Who buys from you? (demographics, psychographics, job, struggles)"
          className="input"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="brand_voice">Brand voice</label>
          <input
            id="brand_voice"
            name="brand_voice"
            placeholder="e.g. playful, premium, direct"
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="unique_value_prop">Unique value prop</label>
          <input
            id="unique_value_prop"
            name="unique_value_prop"
            placeholder="What makes you different?"
            className="input"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
