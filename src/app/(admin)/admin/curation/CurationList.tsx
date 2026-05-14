"use client";

import { useMemo, useState } from "react";
import { Check, CheckSquare, Loader2, Square, Store, X } from "lucide-react";
import { type MarketplaceLead } from "@/lib/marketplace";
import { CurationRow } from "./CurationRow";

type Lead = MarketplaceLead & { raw_payload?: Record<string, unknown> | null };

interface Props {
  rows: Lead[];
  sourceLabels: Record<string, string>;
}

export function CurationList({ rows, sourceLabels }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<null | "selected_approve" | "selected_reject" | "all_approve">(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const visible = useMemo(() => rows.filter((r) => !hidden.has(r.id)), [rows, hidden]);
  const allChecked = visible.length > 0 && visible.every((r) => selected.has(r.id));
  const someChecked = visible.some((r) => selected.has(r.id));

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      if (allChecked) return new Set();
      const next = new Set(prev);
      visible.forEach((r) => next.add(r.id));
      return next;
    });
  }

  async function bulk(scope: "selected" | "all_pending", action: "approve" | "reject") {
    const busyKey = scope === "all_pending" ? "all_approve" : (action === "approve" ? "selected_approve" : "selected_reject");
    setBusy(busyKey);
    setToast(null);
    try {
      const body: Record<string, unknown> = { action, scope };
      if (scope === "selected") body.ids = Array.from(selected);
      const res = await fetch("/api/admin/curation/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({} as { error?: string; affected?: number }));
      if (!res.ok) {
        setToast({ kind: "err", msg: j?.error ?? `HTTP ${res.status}` });
        return;
      }
      const affected = Number(j?.affected ?? 0);
      setToast({
        kind: "ok",
        msg: `${affected} lead${affected === 1 ? "" : "s"} ${action === "approve" ? "imported to marketplace" : "rejected"}.`,
      });
      // Hide rows we just acted on
      setHidden((prev) => {
        const next = new Set(prev);
        if (scope === "all_pending") visible.forEach((r) => next.add(r.id));
        else selected.forEach((id) => next.add(id));
        return next;
      });
      setSelected(new Set());
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      setToast({ kind: "err", msg: (e as Error).message });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Sticky bulk-action bar */}
      <div className="card p-3 sticky top-2 z-10 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          type="button"
          onClick={toggleAllVisible}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white"
        >
          {allChecked ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
          {allChecked ? "Unselect all" : "Select all visible"}
        </button>
        <div className="text-xs text-white/60 font-mono">
          {selected.size} selected · {visible.length} pending
        </div>
        <div className="sm:ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!someChecked || busy !== null}
            onClick={() => bulk("selected", "approve")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/20 ring-1 ring-emerald-400/40 text-emerald-200 hover:bg-emerald-500/30 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy === "selected_approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Import {selected.size > 0 ? `${selected.size} ` : ""}selected
          </button>
          <button
            type="button"
            disabled={!someChecked || busy !== null}
            onClick={() => bulk("selected", "reject")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/15 ring-1 ring-rose-400/30 text-rose-200 hover:bg-rose-500/25 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy === "selected_reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            Reject selected
          </button>
          <button
            type="button"
            disabled={visible.length === 0 || busy !== null}
            onClick={() => {
              if (!confirm(`Import ALL ${visible.length} pending leads into the marketplace?`)) return;
              bulk("all_pending", "approve");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500/20 ring-1 ring-brand-400/40 text-brand-100 hover:bg-brand-500/30 px-3 py-1.5 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy === "all_approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Store className="h-3.5 w-3.5" />}
            Import ALL to marketplace
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={
            toast.kind === "ok"
              ? "card p-3 bg-emerald-500/10 ring-1 ring-emerald-400/30 text-emerald-200 text-sm"
              : "card p-3 bg-rose-500/10 ring-1 ring-rose-400/30 text-rose-200 text-sm"
          }
        >
          {toast.msg}
        </div>
      )}

      <ul className="space-y-3">
        {visible.map((lead) => (
          <li key={lead.id} className="relative">
            <label className="absolute left-3 top-3 z-10 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(lead.id)}
                onChange={() => toggleOne(lead.id)}
                className="h-4 w-4 rounded ring-1 ring-white/20 bg-white/[0.04] accent-brand-400"
              />
            </label>
            <div className="pl-7">
              <CurationRow
                lead={lead}
                sourceLabel={sourceLabels[String((lead.raw_payload as { source?: string })?.source ?? "")]}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
