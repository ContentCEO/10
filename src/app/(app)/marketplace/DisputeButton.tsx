"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, X } from "lucide-react";

const REASONS: { value: string; label: string }[] = [
  { value: "wrong_number",    label: "Wrong phone / can't reach" },
  { value: "duplicate",       label: "Duplicate of a lead I already had" },
  { value: "out_of_area",     label: "Out of my service area" },
  { value: "spam",            label: "Spam / not a real customer" },
  { value: "wrong_service",   label: "Wrong service requested" },
  { value: "unreachable",     label: "Couldn't reach after multiple tries" },
  { value: "not_a_real_lead", label: "Not actually a lead" },
  { value: "other",           label: "Other (explain below)" },
];

export function DisputeButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("wrong_number");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ refunded: boolean; refundCents: number } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplace_lead_id: leadId,
          reason,
          details,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Could not submit");
      setResult({ refunded: data.auto_refunded, refundCents: data.refund_cents });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-xs text-rose-700 hover:underline">
        Report bad lead
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-sm px-4"
          onClick={() => !loading && setOpen(false)}
        >
          <div
            className="card w-full max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => !loading && setOpen(false)}
              className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-lg hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600" /> Report a bad lead
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Wrong number, duplicate, out-of-area, spam, or wrong service auto-refund
              your wallet immediately. Other reasons go through a quick manual review.
            </p>

            {result ? (
              <div className="mt-4 text-sm">
                {result.refunded ? (
                  <p className="text-emerald-700 font-medium">
                    ✅ Refunded ${(result.refundCents / 100).toFixed(2)} to your wallet.
                  </p>
                ) : (
                  <p className="text-slate-700">
                    Dispute opened. We'll review and update your wallet within 24 hours.
                  </p>
                )}
                <button onClick={() => setOpen(false)} className="btn-primary mt-4 w-full">
                  Got it
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 space-y-3">
                <div>
                  <label className="label" htmlFor="reason">Reason</label>
                  <select
                    id="reason" value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="input"
                  >
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="details">Details (optional)</label>
                  <textarea
                    id="details" rows={3} className="input"
                    placeholder="What happened?"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                  />
                </div>
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <button className="btn-danger w-full" disabled={loading}>
                  {loading ? "Submitting…" : "Submit dispute"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
