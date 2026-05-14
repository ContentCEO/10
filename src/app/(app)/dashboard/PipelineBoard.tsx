"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, GripVertical, Loader2, Plus } from "lucide-react";
import { toast } from "@/components/Toaster";

interface PipelineLead {
  id: string;
  name: string;
  status: string;
  service_type: string | null;
  price: number | null;
}

const COLUMNS: { id: string; label: string; tone: string }[] = [
  { id: "new",       label: "New",          tone: "from-indigo-500/30  via-indigo-500/15  to-transparent" },
  { id: "contacted", label: "Contacted",    tone: "from-cyan-500/30    via-cyan-500/15    to-transparent" },
  { id: "estimate",  label: "Estimate",     tone: "from-amber-500/30   via-amber-500/15   to-transparent" },
  { id: "won",       label: "Won",          tone: "from-emerald-500/30 via-emerald-500/15 to-transparent" },
];

// Map any legacy/unknown status into one of the 4 columns.
function bucketize(status: string): string {
  const s = (status ?? "").toLowerCase();
  if (s === "won" || s === "closed" || s === "complete") return "won";
  if (s.includes("estimate") || s === "quote" || s === "proposal") return "estimate";
  if (s === "contacted" || s === "in_progress" || s === "active") return "contacted";
  return "new";
}

export function PipelineBoard({ initial }: { initial: PipelineLead[] }) {
  const [leads, setLeads] = useState(initial);
  const [dragId, setDragId] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(leadId: string, toStatus: string) {
    const before = leads;
    const lead = before.find((l) => l.id === leadId);
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: toStatus } : l));
    startTransition(async () => {
      try {
        const res = await fetch(`/api/leads/${leadId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: toStatus }),
        });
        if (!res.ok) {
          setLeads(before);
          toast({ message: "Couldn't update lead status. Try again.", type: "error" });
          return;
        }
        const col = COLUMNS.find((c) => c.id === toStatus)?.label ?? toStatus;
        toast({ message: `Moved ${lead?.name ?? "lead"} → ${col}`, type: "success" });
      } catch {
        setLeads(before);
        toast({ message: "Couldn't update lead status. Try again.", type: "error" });
      }
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter((l) => bucketize(l.status) === col.id);
        const total = colLeads.reduce((s, l) => s + (l.price ?? 0), 0);
        return (
          <div
            key={col.id}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setHover(col.id); }}
            onDragLeave={() => setHover(null)}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain") || dragId;
              setHover(null); setDragId(null);
              if (id) move(id, col.id);
            }}
            className={
              hover === col.id
                ? "rounded-2xl bg-white/[0.08] ring-2 ring-brand-400/60 p-3 min-h-[200px] transition"
                : "rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-3 min-h-[200px] transition"
            }
          >
            <div className={`relative overflow-hidden rounded-lg bg-gradient-to-br ${col.tone} px-3 py-2 mb-3`}>
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-white/90 font-semibold">{col.label}</div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-white">{colLeads.length}</span>
                {total > 0 && <span className="text-xs text-white/70 tabular-nums">${total.toLocaleString()}</span>}
              </div>
            </div>
            <div className="space-y-1.5">
              {colLeads.length === 0 && (
                <div className="text-xs text-white/30 text-center py-4 border border-dashed border-white/10 rounded-lg">Drop a lead here</div>
              )}
              {colLeads.map((l) => (
                <div
                  key={l.id}
                  draggable
                  onDragStart={(e) => { setDragId(l.id); e.dataTransfer.setData("text/plain", l.id); }}
                  className={
                    "group flex items-start gap-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 p-2.5 cursor-grab active:cursor-grabbing hover:bg-white/[0.08] hover:ring-brand-300/60 transition" +
                    (pending && dragId === l.id ? " opacity-50" : "")
                  }
                >
                  <GripVertical className="h-3 w-3 text-white/30 mt-0.5 shrink-0 group-hover:text-white/60 transition" />
                  <Link href={`/leads/${l.id}`} className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{l.name}</div>
                    <div className="text-[11px] text-white/50 truncate">{l.service_type ?? "—"}</div>
                    {l.price ? <div className="text-[11px] text-emerald-300 font-mono tabular-nums mt-0.5">${l.price.toLocaleString()}</div> : null}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
