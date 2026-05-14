"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "@/components/Toaster";

interface Lead {
  id: string; name: string; status: string; service_type: string | null;
  ai_score: number | null; created_at: string; price: number | null; source: string | null;
}

const STATUSES = ["all", "new", "contacted", "estimate_sent", "won", "lost"] as const;
type StatusFilter = typeof STATUSES[number];

export function BulkLeadsClient({ leads, currentStatus }: { leads: Lead[]; currentStatus: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newStatus, setNewStatus] = useState("contacted");
  const [pending, startTransition] = useTransition();

  const allSelected = leads.length > 0 && selected.size === leads.length;

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(leads.map((l) => l.id)));
  }

  function applyStatus() {
    if (selected.size === 0) return;
    if (!confirm(`Set status of ${selected.size} lead${selected.size === 1 ? "" : "s"} to "${newStatus}"?`)) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/leads/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: Array.from(selected), action: "set_status", status: newStatus }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast({ message: json.error ?? "Failed", type: "error" });
          return;
        }
        toast({ message: `Updated ${selected.size}`, type: "success" });
        setSelected(new Set());
        router.refresh();
      } catch { toast({ message: "Network error", type: "error" }); }
    });
  }

  function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`Permanently delete ${selected.size} lead${selected.size === 1 ? "" : "s"}? This can't be undone.`)) return;
    startTransition(async () => {
      try {
        const res = await fetch("/api/leads/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: Array.from(selected), action: "delete" }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast({ message: json.error ?? "Failed", type: "error" });
          return;
        }
        toast({ message: `Deleted ${selected.size}`, type: "success" });
        setSelected(new Set());
        router.refresh();
      } catch { toast({ message: "Network error", type: "error" }); }
    });
  }

  return (
    <>
      {/* Filter chips */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        {STATUSES.map((s) => (
          <Link key={s}
            href={s === "all" ? "/leads/bulk" : `/leads/bulk?status=${s}`}
            className={`px-3 py-1 rounded-full ring-1 transition ${
              currentStatus === s
                ? "bg-brand-600 text-white ring-brand-600"
                : "bg-white text-ink-700 ring-ink-200 hover:bg-ink-50"
            }`}>
            {s === "all" ? "All" : s.replace("_", " ")}
          </Link>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <section className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40 sticky top-2 z-10 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold tabular-nums">
            {selected.size} selected
          </span>
          <span className="text-xs text-ink-500">→ set status to</span>
          <select className="input py-1 px-2 text-xs" value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}>
            {STATUSES.filter((s) => s !== "all").map((s) =>
              <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <button onClick={applyStatus} disabled={pending} className="btn-primary text-xs py-1 px-3">
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Apply"}
          </button>
          <span className="mx-1 text-ink-300">·</span>
          <button onClick={deleteSelected} disabled={pending}
            className="text-xs text-rose-600 font-semibold hover:underline inline-flex items-center gap-1">
            <Trash2 className="h-3 w-3" /> Delete
          </button>
        </section>
      )}

      <section className="card overflow-hidden">
        {leads.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            No leads matching this filter.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50/70 text-left text-ink-500">
              <tr>
                <th className="px-3 py-2 w-10">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                </th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[11px]">Lead</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[11px]">Service</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[11px]">Source</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[11px] text-right">Score</th>
                <th className="px-3 py-2 font-semibold uppercase tracking-wider text-[11px] text-right">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {leads.map((l) => (
                <tr key={l.id}
                  className={`hover:bg-brand-50/40 ${selected.has(l.id) ? "bg-brand-50/60" : ""}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                  </td>
                  <td className="px-3 py-2 font-medium truncate max-w-[180px]">{l.name}</td>
                  <td className="px-3 py-2 text-ink-600">{l.service_type ?? "—"}</td>
                  <td className="px-3 py-2 text-ink-500 text-xs">{l.source ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className="badge bg-ink-100 text-ink-700 ring-ink-200">{l.status}</span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-mono">{l.ai_score ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-mono">{l.price ? `$${l.price.toLocaleString()}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
