"use client";

import { useState } from "react";

type Plan = "foundation" | "foundation_growth" | "revenue_share";

interface Props {
  slug: string;
  plan?: Plan;
  buttonClass?: string;
  buttonStyle?: React.CSSProperties;
}

export function ClaimForm({ slug, plan, buttonClass, buttonStyle }: Props) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/launchpad/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, plan: plan ?? "foundation_growth", email: email || undefined }),
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
    return (
      <form onSubmit={startCheckout}>
        <button
          type="submit"
          disabled={busy}
          style={buttonStyle}
          className={buttonClass ?? "mt-6 w-full rounded-lg bg-stone-900 text-white px-4 py-2 font-semibold hover:bg-stone-800 disabled:opacity-50"}
        >
          {busy ? "Loading…" : "Choose this tier"}
        </button>
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </form>
    );
  }

  // Lead-capture mode: email + go (no plan selected; defaults to foundation_growth).
  return (
    <form onSubmit={startCheckout} className="mt-4 flex flex-col sm:flex-row gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourbusiness.com"
        className="flex-1 rounded-lg border border-stone-300 px-4 py-2"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg text-white px-5 py-2 font-semibold hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: "#C44A26" }}
      >
        {busy ? "…" : "Talk to Davi"}
      </button>
      {error && <p className="text-xs text-red-600 sm:basis-full">{error}</p>}
    </form>
  );
}
