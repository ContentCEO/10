"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Plus, Wallet, X } from "lucide-react";
import { TOPUP_PACKS, formatCents } from "@/lib/wallet";

export function WalletBar({ balanceCents }: { balanceCents: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function buyPack(pack: string) {
    setLoading(pack);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      });
      const text = await res.text();
      let data: { url?: string; error?: string } = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON */ }
      if (!res.ok || !data.url) {
        throw new Error(
          data.error ??
          (text ? `HTTP ${res.status}: ${text.slice(0, 200)}` : `HTTP ${res.status}`),
        );
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(null);
    }
  }

  async function seed() {
    setSeeding(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 5 }),
      });
      const text = await res.text();
      let data: { error?: string } = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON */ }
      if (!res.ok) {
        throw new Error(
          data.error ??
          (text ? `HTTP ${res.status}: ${text.slice(0, 200)}` : `HTTP ${res.status}`),
        );
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <>
      <div className="card p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow shrink-0">
            <Wallet className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-slate-500">Wallet</div>
            <div className="text-2xl font-bold gradient-text">{formatCents(balanceCents)}</div>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap gap-2 ml-auto">
          <button onClick={() => setOpen(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> Add credit
          </button>
          <button
            onClick={seed}
            disabled={seeding}
            className="btn-secondary"
            title="Generate 5 realistic sample leads with AI"
          >
            {seeding ? "Generating…" : "Seed samples"}
          </button>
        </div>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm px-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="card w-full max-w-lg p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => !loading && setOpen(false)}
              className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-xl font-bold">Add credit</h2>
            <p className="text-sm text-slate-500 mt-1">
              Top up your wallet to claim leads instantly. Larger packs include bonus credit.
            </p>
            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              {TOPUP_PACKS.map((p) => {
                const bonus = p.credit_cents - p.price_cents;
                return (
                  <button
                    key={p.id}
                    onClick={() => buyPack(p.id)}
                    disabled={loading !== null}
                    className="card card-hover p-4 text-left disabled:opacity-50"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-bold">{p.label}</span>
                      {bonus > 0 && (
                        <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200">
                          +{formatCents(bonus)} bonus
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Wallet credit: <strong className="text-slate-900">{formatCents(p.credit_cents)}</strong>
                    </div>
                    {loading === p.id && (
                      <div className="mt-2 text-xs text-brand-700">Opening checkout…</div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> Secure payment via Stripe.
              Credit never expires.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
