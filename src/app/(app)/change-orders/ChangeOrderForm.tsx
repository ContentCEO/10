"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Loader2 } from "lucide-react";
import { toast } from "@/components/Toaster";

export function ChangeOrderForm() {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [scope, setScope] = useState("");
  const [priceDelta, setPriceDelta] = useState("");
  const [timelineDelta, setTimelineDelta] = useState("0");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!reason.trim() || !scope.trim()) {
      toast({ message: "Reason + scope are required", type: "error" });
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/change-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: reason.trim(),
            scope_change: scope.trim(),
            price_delta_cents: Math.round(Number(priceDelta) * 100) || 0,
            timeline_delta_days: Math.round(Number(timelineDelta)) || 0,
          }),
        });
        if (!res.ok) {
          toast({ message: "Couldn't create change order", type: "error" });
          return;
        }
        toast({ message: "Change order drafted", type: "success" });
        setReason(""); setScope(""); setPriceDelta(""); setTimelineDelta("0");
        router.refresh();
      } catch {
        toast({ message: "Couldn't create change order", type: "error" });
      }
    });
  }

  return (
    <section className="card p-5">
      <h2 className="font-semibold tracking-tight mb-4 flex items-center gap-2">
        <FileSignature className="h-4 w-4 text-brand-600" /> New change order
      </h2>
      <div className="space-y-3">
        <div>
          <label className="label" htmlFor="reason">Reason</label>
          <input id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}
            placeholder="Customer requested upgraded fixtures" maxLength={500} />
        </div>
        <div>
          <label className="label" htmlFor="scope">Scope change</label>
          <textarea id="scope" rows={3} className="input min-h-[80px]" value={scope} onChange={(e) => setScope(e.target.value)}
            placeholder="Swap Kohler basic fixtures for Toto luxury line. Includes 3 sinks + 2 tubs." maxLength={5000} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="price">Price delta ($)</label>
            <input id="price" type="number" step="0.01" className="input" value={priceDelta} onChange={(e) => setPriceDelta(e.target.value)}
              placeholder="850" />
            <div className="mt-1 text-xs text-ink-500">Positive for addition, negative for credit.</div>
          </div>
          <div>
            <label className="label" htmlFor="timeline">Timeline delta (days)</label>
            <input id="timeline" type="number" step="1" className="input" value={timelineDelta} onChange={(e) => setTimelineDelta(e.target.value)} />
          </div>
        </div>
        <button onClick={submit} disabled={pending} className="btn-primary w-full justify-center">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
          Save draft
        </button>
      </div>
    </section>
  );
}
