"use client";

import { useState, useMemo, useEffect } from "react";
import { Hammer, Package, Plus, Sparkles, Trash2, Wallet } from "lucide-react";

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

      <PricingSuggestion total={total} />

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

/* Sister: pulls /api/ai/price-suggest data when user types a service name. */
interface SuggestResp {
  ok: boolean;
  service: string;
  sample_size: number;
  message?: string;
  suggested?: { conservative: number; median: number; aggressive: number };
  range?: { min: number; max: number };
  win_rate_by_band?: {
    low:  { win_rate: number };
    mid:  { win_rate: number };
    high: { win_rate: number };
  };
}

function PricingSuggestion({ total }: { total: number }) {
  const [service, setService] = useState("");
  const [data, setData] = useState<SuggestResp | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = service.trim();
    if (q.length < 3) { setData(null); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/ai/price-suggest?service=${encodeURIComponent(q)}`);
        const json = await res.json();
        if (json.ok) setData(json);
      } catch { /* silent */ }
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [service]);

  const band = total > 0 && data?.suggested
    ? (total <= data.suggested.conservative ? "low"
      : total >= data.suggested.aggressive ? "high"
      : "mid")
    : null;

  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <h2 className="text-base font-semibold">Suggested price from your history</h2>
      </div>
      <input
        className="input mb-3"
        placeholder="Type the service type (e.g. bathroom remodel, gutter clean)"
        value={service}
        onChange={(e) => setService(e.target.value)}
      />
      {loading && <div className="text-xs text-ink-500 italic">Looking at your past wins…</div>}
      {data && data.sample_size === 0 && (
        <div className="text-xs text-ink-500 italic">{data.message}</div>
      )}
      {data?.suggested && data.range && (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Tier label="Conservative" sub="25th pct" v={data.suggested.conservative}
              winRate={data.win_rate_by_band?.low.win_rate} />
            <Tier label="Median"       sub="50th pct" v={data.suggested.median}    accent
              winRate={data.win_rate_by_band?.mid.win_rate} />
            <Tier label="Aggressive"   sub="75th pct" v={data.suggested.aggressive}
              winRate={data.win_rate_by_band?.high.win_rate} />
          </div>
          <div className="mt-2 text-[11px] text-ink-500">
            Based on <span className="font-mono tabular-nums">{data.sample_size}</span> past matches
            (range ${data.range.min.toLocaleString()}–${data.range.max.toLocaleString()}).
          </div>
          {total > 0 && band && (
            <div className={`mt-3 text-xs rounded-lg p-2 ${
              band === "high" ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" :
              band === "low"  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200" :
                                "bg-brand-50 text-brand-800 ring-1 ring-brand-200"}`}>
              Your current quote of <strong>${total.toFixed(0)}</strong>{" "}
              is in the <strong>{band}</strong> band — historical win rate at this price:{" "}
              <strong className="tabular-nums font-mono">
                {Math.round((data.win_rate_by_band?.[band].win_rate ?? 0) * 100)}%
              </strong>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Tier({ label, sub, v, accent, winRate }: {
  label: string; sub: string; v: number; accent?: boolean; winRate?: number;
}) {
  return (
    <div className={`rounded-lg p-3 ${accent ? "bg-brand-50 ring-1 ring-brand-300" : "bg-ink-50"}`}>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="text-[9px] text-ink-400 font-mono">{sub}</div>
      <div className="text-lg tabular-nums font-mono font-semibold text-ink-900 mt-1">
        ${v.toLocaleString()}
      </div>
      {winRate != null && winRate > 0 && (
        <div className="text-[10px] text-ink-500 font-mono tabular-nums">
          win {(winRate * 100).toFixed(0)}%
        </div>
      )}
    </div>
  );
}
