import Link from "next/link";
import { Flame, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LeadStatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Lead } from "@/lib/types";
import { QuickAdd } from "./QuickAdd";

export const dynamic = "force-dynamic";

function ageDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function AgeBadge({ iso, status }: { iso: string; status: Lead["status"] }) {
  // Closed-out leads don't get aged.
  if (status === "won" || status === "lost") {
    return <span className="text-xs text-slate-400">{formatDate(iso)}</span>;
  }
  const d = ageDays(iso);
  let tone = "bg-slate-100 text-slate-600 ring-slate-200";
  let label = `${d}d`;
  if (d >= 14) { tone = "bg-rose-100 text-rose-700 ring-rose-200"; label = `${d}d · stale`; }
  else if (d >= 7) { tone = "bg-amber-100 text-amber-800 ring-amber-200"; label = `${d}d · cool`; }
  else if (d <= 0) { tone = "bg-emerald-100 text-emerald-700 ring-emerald-200"; label = "today"; }
  return <span className={`badge ${tone}`}>{label}</span>;
}

export default async function LeadsPage() {
  const supabase = createClient();
  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  const rows = (leads ?? []) as Lead[];
  const staleCount = rows.filter(
    (l) => l.status !== "won" && l.status !== "lost" && ageDays(l.updated_at) >= 7,
  ).length;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          {staleCount > 0 && (
            <p className="text-sm text-amber-700 flex items-center gap-1.5 mt-1">
              <Flame className="h-3.5 w-3.5" />
              {staleCount} lead{staleCount === 1 ? "" : "s"} need attention
            </p>
          )}
        </div>
        <Link href="/leads/new" className="btn-secondary">
          <Plus className="h-4 w-4" /> New lead
        </Link>
      </header>

      <QuickAdd />

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Service</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Source</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Estimated</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? rows.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/leads/${lead.id}`} className="font-medium text-brand-700">
                    {lead.name}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {lead.email ?? lead.phone ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">{lead.service_type ?? "—"}</td>
                <td className="px-4 py-3 hidden md:table-cell text-slate-600">
                  {lead.source ?? "—"}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">{formatCurrency(lead.estimated_value)}</td>
                <td className="px-4 py-3"><LeadStatusBadge status={lead.status} /></td>
                <td className="px-4 py-3">
                  <AgeBadge iso={lead.updated_at} status={lead.status} />
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  No leads yet. Try the AI quick-add above, or
                  <Link href="/leads/new" className="text-brand-600 font-medium"> use the full form.</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
