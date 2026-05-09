"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Customer = { id: string; label: string };
type Line = { description: string; quantity: string; unit_price: string };

export default function InvoiceForm({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<Line[]>([{ description: "", quantity: "1", unit_price: "" }]);
  const [error, setError] = useState<string | null>(null);

  const total = lines.reduce(
    (s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0),
    0
  );

  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          due_date: dueDate || null,
          notes: notes || null,
          lines: lines
            .filter((l) => l.description)
            .map((l) => ({
              description: l.description,
              quantity: Number(l.quantity) || 1,
              unit_price_cents: Math.round((Number(l.unit_price) || 0) * 100)
            }))
        })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "Could not create invoice.");
        return;
      }
      setLines([{ description: "", quantity: "1", unit_price: "" }]);
      setNotes("");
      setDueDate("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Customer</label>
          <select className="select" required value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Due date (optional)</label>
          <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">Line items</label>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <input
                className="input col-span-7"
                placeholder="Description"
                value={l.description}
                onChange={(e) => setLine(i, { description: e.target.value })}
              />
              <input
                className="input col-span-2"
                type="number"
                min="0"
                step="0.5"
                value={l.quantity}
                onChange={(e) => setLine(i, { quantity: e.target.value })}
              />
              <input
                className="input col-span-3"
                type="number"
                min="0"
                step="0.01"
                placeholder="Unit price"
                value={l.unit_price}
                onChange={(e) => setLine(i, { unit_price: e.target.value })}
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn-ghost mt-2 text-sm"
          onClick={() => setLines((p) => [...p, { description: "", quantity: "1", unit_price: "" }])}
        >
          + Add line
        </button>
      </div>
      <div>
        <label className="label">Notes</label>
        <textarea className="textarea" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          Total: <span className="font-medium text-slate-900">${total.toFixed(2)}</span>
        </p>
        <button className="btn-primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create invoice"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}
    </form>
  );
}
