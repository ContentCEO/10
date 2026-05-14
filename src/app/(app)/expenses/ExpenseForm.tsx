"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "@/components/Toaster";

interface Props {
  jobs: Array<{ id: string; title: string }>;
}

const KINDS = [
  { v: "material", l: "Material" },
  { v: "labor", l: "Labor" },
  { v: "subcontractor", l: "Subcontractor" },
  { v: "equipment", l: "Equipment" },
  { v: "permit", l: "Permit" },
  { v: "fuel", l: "Fuel" },
  { v: "other", l: "Other" },
];

export function ExpenseForm({ jobs }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState("material");
  const [vendor, setVendor] = useState("");
  const [amount, setAmount] = useState("");
  const [tax, setTax] = useState("");
  const [jobId, setJobId] = useState("");
  const [desc, setDesc] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!amount) { toast({ message: "Amount required", type: "error" }); return; }
    startTransition(async () => {
      try {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            vendor: vendor.trim() || undefined,
            description: desc.trim() || undefined,
            amount_cents: Math.round(Number(amount) * 100),
            tax_cents: tax ? Math.round(Number(tax) * 100) : 0,
            job_id: jobId || undefined,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast({ message: err.error ?? "Couldn't save expense", type: "error" });
          return;
        }
        toast({ message: "Expense logged", type: "success" });
        setVendor(""); setAmount(""); setTax(""); setDesc(""); setJobId("");
        router.refresh();
      } catch {
        toast({ message: "Network error", type: "error" });
      }
    });
  }

  return (
    <section className="card p-5">
      <h2 className="text-base font-semibold mb-3">Log an expense</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="label">Kind</label>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Amount ($)</label>
          <input className="input" type="number" step="0.01" inputMode="decimal" value={amount}
                 onChange={(e) => setAmount(e.target.value)} placeholder="125.40" />
        </div>
        <div>
          <label className="label">Sales tax ($)</label>
          <input className="input" type="number" step="0.01" inputMode="decimal" value={tax}
                 onChange={(e) => setTax(e.target.value)} placeholder="0" />
        </div>
        <div>
          <label className="label">Vendor</label>
          <input className="input" value={vendor}
                 onChange={(e) => setVendor(e.target.value)} placeholder="Home Depot" maxLength={200} />
        </div>
        <div>
          <label className="label">Linked job</label>
          <select className="input" value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">— None —</option>
            {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Description (optional)</label>
          <input className="input" value={desc}
                 onChange={(e) => setDesc(e.target.value)} placeholder="3x2x8 lumber for deck" maxLength={500} />
        </div>
      </div>
      <button onClick={submit} disabled={pending} className="btn-primary mt-4">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Log expense
      </button>
    </section>
  );
}
