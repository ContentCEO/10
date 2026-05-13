"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, PenTool } from "lucide-react";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";

interface Tier { name: string; price_cents: number }

export function ProposalActions({
  shareToken, tiers,
}: { shareToken: string; tiers: Tier[] }) {
  const router = useRouter();
  const [selectedIdx, setSelectedIdx] = useState<number>(1); // default to middle / "Most popular"
  const [signature, setSignature] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const padRef = useRef<SignaturePadHandle>(null);

  async function sign() {
    if (!signature.trim()) {
      setError("Please type your full name to sign");
      return;
    }
    const pad = padRef.current;
    const signatureData = pad && !pad.isEmpty() ? pad.toDataURL() : undefined;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/proposals/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          share_token: shareToken,
          selected_tier_idx: selectedIdx,
          customer_signature: signature.trim(),
          signature_data: signatureData,
        }),
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card p-6 ring-2 ring-brand-200 bg-gradient-to-br from-brand-50/40 to-white">
      <h3 className="font-bold text-lg flex items-center gap-2 tracking-tight">
        <PenTool className="h-4 w-4 text-brand-600" /> Approve &amp; e-sign
      </h3>
      <p className="mt-1 text-sm text-ink-600">
        Pick your tier, type your full name to sign. Legally-binding e-signature.
      </p>

      <div className="mt-4">
        <label className="label">Your selection</label>
        <div className="grid grid-cols-3 gap-2">
          {tiers.map((t, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedIdx(i)}
              className={`rounded-xl border px-3 py-3 text-center text-sm transition ${
                selectedIdx === i
                  ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-200"
                  : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50"
              }`}
            >
              <div className="font-semibold">{t.name}</div>
              <div className="text-xs tabular-nums mt-0.5">${(t.price_cents / 100).toLocaleString()}</div>
              {selectedIdx === i && <Check className="h-3.5 w-3.5 mx-auto mt-1.5 text-brand-600" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="label">Type your full name</label>
        <input
          className="input font-mono italic text-lg"
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
          placeholder="Jane Smith"
        />
      </div>

      <div className="mt-4">
        <label className="label">Draw your signature (optional)</label>
        <SignaturePad ref={padRef} height={140} />
      </div>

      <button onClick={sign} disabled={submitting} className="btn-primary mt-5 w-full">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Sign &amp; approve · ${(tiers[selectedIdx].price_cents / 100).toLocaleString()}
      </button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
