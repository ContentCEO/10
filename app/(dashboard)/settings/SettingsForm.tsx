"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SettingsForm({
  id,
  name: initialName,
  businessContext: initialContext,
  plan,
}: {
  id: string;
  name: string;
  businessContext: string;
  plan: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [businessContext, setBusinessContext] = useState(initialContext);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setInfo(null);
    setError(null);
    const res = await fetch("/api/workspace", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, business_context: businessContext }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to save");
      return;
    }
    setInfo("Saved.");
    router.refresh();
  }

  async function upgrade() {
    setBillingLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    setBillingLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Billing not configured");
      return;
    }
    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  return (
    <div className="mt-6 space-y-6">
      <form onSubmit={save} className="card p-6 space-y-4">
        <div>
          <label className="label">Workspace name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Business context (used for AI personalization)</label>
          <textarea
            className="input"
            rows={5}
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
            placeholder="We're a B2B accounting firm helping startups close their books faster. Our typical engagement is $2k/mo. We help founders save 10+ hours a month."
          />
          <p className="text-xs text-slate-500 mt-1">
            The AI uses this when writing personalized follow-ups.
          </p>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {info && <p className="text-sm text-emerald-700">{info}</p>}
        <button className="btn-primary" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </form>

      <div className="card p-6">
        <h2 className="font-semibold">Billing</h2>
        <p className="text-sm text-slate-600 mt-1">Current plan: <span className="font-medium">{plan}</span></p>
        <button className="btn-secondary mt-4" onClick={upgrade} disabled={billingLoading}>
          {billingLoading ? "Loading…" : "Manage billing"}
        </button>
        <p className="text-xs text-slate-500 mt-2">
          Requires <code>STRIPE_SECRET_KEY</code> and <code>NEXT_PUBLIC_STRIPE_PRICE_ID</code>.
        </p>
      </div>
    </div>
  );
}
