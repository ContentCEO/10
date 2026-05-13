"use client";

import { useState, useMemo } from "react";
import { Hammer, Package, Plus, Trash2, Wallet } from "lucide-react";

interface Line {
  id: number;
  kind: "material" | "labor" | "other";
  description: string;
  qty: number;
  unitPrice: number;
}

let LINE_ID = 1;

function newLine(kind: Line["kind"]): Line {
  return { id: LINE_ID++, kind, description: "", qty: 1, unitPrice: 0 };
}

const KIND_ICON = { material: Package, labor: Hammer, other: Wallet };

export function QuickEstimateBuilder() {
  const [lines, setLines] = useState<Line[]>([
    { id: LINE_ID++, kind: "material", description: "", qty: 1, unitPrice: 0 },
    { id: LINE_ID++, kind: "labor",    description: "", qty: 1, unitPrice: 0 },
  ]);
  const [markupPct, setMarkupPct] = useState(35);
  const [taxPct, setTaxPct] = useState(0);
  const [discount, setDiscount] = useState(0);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
    [lines],
  );
  const markup = subtotal * (markupPct / 100);
  const afterMarkup = subtotal + markup;
  const afterDiscount = Math.max(0, afterMarkup - discount);
  const tax = afterDiscount * (taxPct / 100);
  const total = afterDiscount + tax;

  function update(id: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }
  function remove(id: number) {
    setLines((ls) => ls.filter((l) => l.id !== id));
  }
  function add(kind: Line["kind"]) {
    setLines((ls) => [...ls, newLine(kind)]);
  }

  function copySummary() {
    const lineText = lines
      .filter((l) => l.description.trim() && l.unitPrice > 0)
      .map((l) => `${l.description} · ${l.qty} × $${l.unitPrice.toFixed(2)} = $${(l.qty * l.unitPrice).toFixed(2)}`)
      .join("\n");
    const text = `${lineText}\n\nSubtotal: $${subtotal.toFixed(2)}\nMarkup (${markupPct}%): $${markup.toFixed(2)}${discount > 0 ? `\nDiscount: -$${discount.toFixed(2)}` : ""}${taxPct > 0 ? `\nTax (${taxPct}%): $${tax.toFixed(2)}` : ""}\nTotal: $${total.toFixed(2)}`;
    navigator.clipboard?.writeText(text);
  }

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Line items</h2>
          <div className="flex gap-2">
            <button onClick={() => add("material")} className="btn-secondary text-xs">
              <Package className="h-3.5 w-3.5" /> Material
            </button>
            <button onClick={() => add("labor")} className="btn-secondary text-xs">
              <Hammer className="h-3.5 w-3.5" /> Labor
            </button>
            <button onClick={() => add("other")} className="btn-secondary text-xs">
              <Plus className="h-3.5 w-3.5" /> Other
            </button>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="text-sm text-ink-500 text-center py-8 italic">
            No line items yet. Add one above.
          </div>
        ) : (
          <ul className="space-y-2">
            {lines.map((l) => {
              const Icon = KIND_ICON[l.kind];
              return (
                <li key={l.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1 text-ink-400 flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <input
                    className="input col-span-5"
                    placeholder={l.kind === "material" ? "2x4 lumber, 12ft" : l.kind === "labor" ? "Demo, framing, painting" : "Description"}
                    value={l.description}
                    onChange={(e) => update(l.id, { description: e.target.value })}
                  />
                  <input
                    className="input col-span-2 text-right tabular-nums"
                    type="number" step="0.5" inputMode="decimal"
                    value={l.qty}
                    onChange={(e) => update(l.id, { qty: Number(e.target.value) || 0 })}
                  />
                  <input
                    className="input col-span-3 text-right tabular-nums"
                    type="number" step="0.01" inputMode="decimal"
                    placeholder="0.00"
                    value={l.unitPrice || ""}
                    onChange={(e) => update(l.id, { unitPrice: Number(e.target.value) || 0 })}
                  />
                  <button onClick={() => remove(l.id)} aria-label="Remove"
                    className="col-span-1 text-ink-300 hover:text-rose-600 transition flex items-center justify-center">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3">Markup &amp; tax</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Markup (%)</label>
            <input className="input text-right tabular-nums" type="number" step="1" inputMode="decimal"
              value={markupPct} onChange={(e) => setMarkupPct(Number(e.target.value) || 0)} />
            <div className="mt-1 text-[10px] text-ink-500">30-50% typical · gross margin</div>
          </div>
          <div>
            <label className="label">Discount ($)</label>
            <input className="input text-right tabular-nums" type="number" step="1" inputMode="decimal"
              value={discount || ""} placeholder="0"
              onChange={(e) => setDiscount(Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className="label">Sales tax (%)</label>
            <input className="input text-right tabular-nums" type="number" step="0.25" inputMode="decimal"
              value={taxPct || ""} placeholder="0"
              onChange={(e) => setTaxPct(Number(e.target.value) || 0)} />
            <div className="mt-1 text-[10px] text-ink-500">MA: 6.25% · NY: 8% · varies</div>
          </div>
        </div>
      </section>

      <section className="card p-5 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40">
        <h2 className="text-base font-semibold mb-3">Quote</h2>
        <dl className="space-y-1 text-sm">
          <Row label="Subtotal" value={subtotal} />
          <Row label={`Markup (${markupPct}%)`} value={markup} muted />
          {discount > 0 && <Row label="Discount" value={-discount} muted />}
          {taxPct > 0 && <Row label={`Tax (${taxPct}%)`} value={tax} muted />}
          <div className="border-t border-ink-200/70 my-2" />
          <Row label="Total" value={total} big />
        </dl>
        <div className="mt-4 flex gap-2">
          <button onClick={copySummary} className="btn-primary text-sm">
            Copy quote
          </button>
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, muted = false, big = false }: {
  label: string; value: number; muted?: boolean; big?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between ${muted ? "text-ink-500 text-xs" : ""}`}>
      <dt>{label}</dt>
      <dd className={`tabular-nums font-mono ${big ? "text-2xl font-semibold text-ink-900" : ""}`}>
        ${value.toFixed(2)}
      </dd>
    </div>
  );
}
