"use client";

import { useState } from "react";

type Plan = "one_time" | "monthly" | "ad_management";

interface Props {
  slug: string;
  plan?: Plan;
  buttonClass?: string;
}

export function ClaimForm({ slug, plan, buttonClass }: Props) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auto-outreach/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, plan: plan ?? "one_time", email: email || undefined }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url as string;
      } else {
        setError(data.error ?? "Could not start checkout");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  if (plan) {
    // Card-mode: just a button.
    return (
      <form onSubmit={startCheckout}>
        <button
          type="submit"
          disabled={busy}
          className={buttonClass ?? "mt-6 w-full rounded-lg bg-slate-900 text-white px-4 py-2 font-semibold hover:bg-slate-800 disabled:opacity-50"}
        >
          {busy ? "Loading…" : "Choose this plan"}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </form>
    );
  }

  // Lead-capture mode: email + go.
  return (
    <form onSubmit={startCheckout} className="mt-4 flex flex-col sm:flex-row gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourbusiness.com"
        className="flex-1 rounded-lg border border-slate-300 px-4 py-2"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-slate-900 text-white px-5 py-2 font-semibold hover:bg-slate-800 disabled:opacity-50"
      >
        {busy ? "…" : "Continue"}
      </button>
      {error && <p className="text-xs text-red-600 sm:basis-full">{error}</p>}
    </form>
  );
}
