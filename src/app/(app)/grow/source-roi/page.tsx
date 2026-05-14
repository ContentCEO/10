import { redirect } from "next/navigation";
import { Megaphone, TrendingDown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Lead source ROI deep-dive. Goes beyond the dashboard tile by showing
// per-source conversion rate, average price, win rate, and ranked
// effectiveness. Helps the contractor decide where to spend more.

interface Lead {
  id: string;
  source: string | null;
  status: string;
  price: number | null;
  created_at: string;
}

interface SourceStats {
  source: string;
  total: number;
  won: number;
  lost: number;
  open: number;
  win_rate: number;
  avg_won_price: number;
  total_won_revenue: number;
  pipeline_value: number;
}

export default async function SourceRoiPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: leads } = await supabase
    .from("leads")
    .select("id,source,status,price,created_at")
    .eq("user_id", user.id)
    .gte("created_at", ninetyDaysAgo)
    .limit(2000);

  const rows = (leads ?? []) as Lead[];

  // Aggregate per source.
  const groups = new Map<string, Lead[]>();
  for (const l of rows) {
    const k = (l.source ?? "—").toLowerCase();
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(l);
  }

  const stats: SourceStats[] = Array.from(groups.entries()).map(([source, ls]) => {
    const total = ls.length;
    const won = ls.filter((l) => l.status === "won");
    const lost = ls.filter((l) => l.status === "lost");
    const open = ls.filter((l) => l.status !== "won" && l.status !== "lost");
    const totalDecided = won.length + lost.length;
    const wonRevenue = won.reduce((s, l) => s + (l.price ?? 0), 0);
    const openValue = open.reduce((s, l) => s + (l.price ?? 0), 0);
    return {
      source: source === "—" ? "Direct / unknown" : source,
      total,
      won: won.length,
      lost: lost.length,
      open: open.length,
      win_rate: totalDecided > 0 ? won.length / totalDecided : 0,
      avg_won_price: won.length > 0 ? wonRevenue / won.length : 0,
      total_won_revenue: wonRevenue,
      pipeline_value: openValue,
    };
  });

  // Sort by total won revenue.
  stats.sort((a, b) => b.total_won_revenue - a.total_won_revenue);

  const totalLeads    = rows.length;
  const totalWonRev   = stats.reduce((s, st) => s + st.total_won_revenue, 0);
  const totalPipeline = stats.reduce((s, st) => s + st.pipeline_value, 0);

  const overallWinRate = stats.reduce(
    (s, st) => s + st.win_rate * (st.won + st.lost), 0)
    / Math.max(1, stats.reduce((s, st) => s + st.won + st.lost, 0));

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Megaphone className="h-3.5 w-3.5" /> Growth · Source ROI</span>
          <h1 className="mt-2 display-h2">
            Which lead sources <em>actually pay</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Last 90 days, grouped by source. Win rate and average closed
            price tell you where to spend more — and where to cut.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Stat label="Total leads (90d)" value={String(totalLeads)} />
        <Stat label="Won revenue" value={`$${totalWonRev.toLocaleString()}`} />
        <Stat label="Open pipeline" value={`$${Math.round(totalPipeline).toLocaleString()}`} />
        <Stat label="Overall win rate" value={`${(overallWinRate * 100).toFixed(0)}%`} />
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">By source</h2>
        </div>
        {stats.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            No leads in the last 90 days yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/70 text-left text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Source</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Leads</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Won</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Win %</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Avg job</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Total won</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Pipeline</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {stats.map((s) => {
                  const beatAvg = s.win_rate > overallWinRate;
                  return (
                    <tr key={s.source} className="hover:bg-brand-50/40">
                      <td className="px-4 py-3 font-medium">{s.source}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono">{s.total}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-emerald-700">{s.won}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono">
                        <span className={`inline-flex items-center gap-1 ${beatAvg ? "text-emerald-700" : "text-ink-500"}`}>
                          {beatAvg ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {(s.win_rate * 100).toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono">
                        {s.avg_won_price ? `$${Math.round(s.avg_won_price).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono font-semibold">
                        ${s.total_won_revenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">
                        ${Math.round(s.pipeline_value).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="mt-1 text-2xl tabular-nums font-mono text-ink-900">{value}</div>
    </div>
  );
}
