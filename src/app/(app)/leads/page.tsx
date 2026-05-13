import Link from "next/link";
import { ArrowUpDown, Flame, Plus, Sparkles, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LeadStatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Lead } from "@/lib/types";
import { QuickAdd } from "./QuickAdd";
import { SavedFilters } from "./SavedFilters";

export const dynamic = "force-dynamic";

function ageDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function AgeBadge({ iso, status }: { iso: string; status: Lead["status"] }) {
  if (status === "won" || status === "lost") {
    return <span className="text-xs text-ink-400">{formatDate(iso)}</span>;
  }
  const d = ageDays(iso);
  let tone = "bg-ink-100 text-ink-600 ring-ink-200";
  let label = `${d}d`;
  if (d >= 14)      { tone = "bg-rose-100 text-rose-700 ring-rose-200"; label = `${d}d · stale`; }
  else if (d >= 7)  { tone = "bg-amber-100 text-amber-800 ring-amber-200"; label = `${d}d · cool`; }
  else if (d <= 0)  { tone = "bg-emerald-100 text-emerald-700 ring-emerald-200"; label = "today"; }
  return <span className={`badge ${tone}`}>{label}</span>;
}

function ScoreChip({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-ink-400">—</span>;
  const tone =
    score >= 75 ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
    : score >= 50 ? "bg-amber-100 text-amber-700 ring-amber-200"
    : "bg-rose-100 text-rose-700 ring-rose-200";
  return (
    <span className={`badge ${tone} tabular-nums`}>
      <Flame className="h-3 w-3 mr-1" /> {score}
    </span>
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { sort?: string; status?: string; stale?: string };
}) {
  const supabase = createClient();
  const sortByScore = searchParams.sort === "score";

  let query = supabase.from("leads").select("*");

  // Status filter: "open" = anything not won/lost.
  if (searchParams.status === "open") {
    query = query.not("status", "in", "(won,lost)");
  } else if (searchParams.status === "won") {
    query = query.eq("status", "won");
  } else if (searchParams.status === "lost") {
    query = query.eq("status", "lost");
  } else if (searchParams.status === "new") {
    query = query.eq("status", "new");
  }

  // Stale filter: only leads not updated in >= N days.
  const staleDays = searchParams.stale ? Number(searchParams.stale) : null;
  if (staleDays && Number.isFinite(staleDays) && staleDays > 0) {
    const cutoff = new Date(Date.now() - staleDays * 86_400_000).toISOString();
    query = query.lte("updated_at", cutoff).not("status", "in", "(won,lost)");
  }

  const { data: leads } = await (
    sortByScore
      ? query
          .order("ai_score", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false })
  );
  const rows = (leads ?? []) as Lead[];

  const total       = rows.length;
  const open        = rows.filter((l) => l.status !== "won" && l.status !== "lost").length;
  const wonCount    = rows.filter((l) => l.status === "won").length;
  const staleCount  = rows.filter(
    (l) => l.status !== "won" && l.status !== "lost" && ageDays(l.updated_at) >= 7,
  ).length;

  return (
    <div className="space-y-6">
      <header className="relative card p-6 sm:p-7 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="min-w-0">
            <span className="section-eyebrow"><Sparkles className="h-3.5 w-3.5" /> Pipeline</span>
            <h1 className="mt-2 display-h2">Leads</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="badge bg-ink-100 text-ink-700 ring-ink-200">
                <TrendingUp className="h-3 w-3 mr-1" /> {total} total
              </span>
              <span className="badge bg-brand-100 text-brand-700 ring-brand-200">
                {open} open
              </span>
              <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200">
                {wonCount} won
              </span>
              {staleCount > 0 && (
                <span className="badge bg-amber-100 text-amber-800 ring-amber-200">
                  <Flame className="h-3 w-3 mr-1" /> {staleCount} need attention
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={sortByScore ? "/leads" : "/leads?sort=score"}
              className="btn-secondary text-xs"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {sortByScore ? "Newest" : "AI score"}
            </Link>
            <Link href="/leads/new" className="btn-primary">
              <Plus className="h-4 w-4" /> New lead
            </Link>
          </div>
        </div>
      </header>

      <SavedFilters />

      <QuickAdd />

      {/* Desktop table */}
      <div className="card overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead className="bg-ink-50/70 text-left text-ink-500">
            <tr>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Name</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] hidden lg:table-cell">Service</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Source</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Score</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] hidden lg:table-cell">Estimated</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Status</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {rows.length ? rows.map((lead) => (
              <tr key={lead.id} className="hover:bg-brand-50/40 transition-colors group">
                <td className="px-4 py-3">
                  <Link href={`/leads/${lead.id}`} className="font-medium text-ink-900 group-hover:text-brand-700 transition-colors">
                    {lead.name}
                  </Link>
                  <div className="text-xs text-ink-500 truncate max-w-[220px]">
                    {lead.email ?? lead.phone ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-ink-700">{lead.service_type ?? "—"}</td>
                <td className="px-4 py-3 text-ink-600 text-xs">{lead.source ?? "—"}</td>
                <td className="px-4 py-3"><ScoreChip score={lead.ai_score} /></td>
                <td className="px-4 py-3 hidden lg:table-cell tabular-nums text-ink-800">{formatCurrency(lead.estimated_value)}</td>
                <td className="px-4 py-3"><LeadStatusBadge status={lead.status} /></td>
                <td className="px-4 py-3"><AgeBadge iso={lead.updated_at} status={lead.status} /></td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-ink-500">
                  No leads yet. Try the AI quick-add above, or
                  <Link href="/leads/new" className="text-brand-600 font-medium"> use the full form.</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {rows.length ? rows.map((lead) => (
          <Link
            key={lead.id}
            href={`/leads/${lead.id}`}
            className="card card-hover p-4 block"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold tracking-tight truncate">{lead.name}</div>
                <div className="text-xs text-ink-500 truncate">
                  {lead.service_type ?? lead.email ?? lead.phone ?? "—"}
                </div>
              </div>
              <ScoreChip score={lead.ai_score} />
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <LeadStatusBadge status={lead.status} />
              <AgeBadge iso={lead.updated_at} status={lead.status} />
            </div>
          </Link>
        )) : (
          <div className="card p-8 text-center text-sm text-ink-500">
            No leads yet. Try AI quick-add or
            <Link href="/leads/new" className="text-brand-600 font-medium"> add manually.</Link>
          </div>
        )}
      </div>
    </div>
  );
}
