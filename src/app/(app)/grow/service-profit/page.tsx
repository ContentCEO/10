import { redirect } from "next/navigation";
import { TrendingUp, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface LeadLite { service_type: string | null; price: number | null; status: string; }
interface JobLite  { id: string; price: number | null; lead_id: string | null; status: string; }
interface ExpLite  { job_id: string | null; amount_cents: number; tax_cents: number; }

interface ServiceRow {
  service: string;
  jobs: number;
  revenue: number;
  expenses: number;
  profit: number;
  margin_pct: number;
  avg_price: number;
  win_rate: number;
}

export default async function ServiceProfitPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: leads }, { data: jobs }, { data: expenses }] = await Promise.all([
    supabase.from("leads").select("service_type,price,status,id").eq("user_id", user.id),
    supabase.from("jobs").select("id,price,lead_id,status").eq("user_id", user.id).eq("status", "completed"),
    supabase.from("job_expenses").select("job_id,amount_cents,tax_cents").eq("user_id", user.id),
  ]);

  const leadRows = (leads ?? []) as Array<LeadLite & { id: string }>;
  const jobRows = (jobs ?? []) as JobLite[];
  const expRows = (expenses ?? []) as ExpLite[];

  // Map: lead_id -> service
  const leadToService = new Map<string, string>();
  for (const l of leadRows) {
    if (l.service_type) leadToService.set(l.id, l.service_type);
  }

  // Aggregate by service.
  const byService = new Map<string, { jobs: number; revenue: number; expenses: number }>();
  for (const j of jobRows) {
    const service = j.lead_id ? leadToService.get(j.lead_id) ?? "Other" : "Other";
    const cur = byService.get(service) ?? { jobs: 0, revenue: 0, expenses: 0 };
    cur.jobs++;
    cur.revenue += j.price ?? 0;
    byService.set(service, cur);
  }
  // Expenses by job → service
  const jobToService = new Map<string, string>();
  for (const j of jobRows) {
    const s = j.lead_id ? leadToService.get(j.lead_id) ?? "Other" : "Other";
    jobToService.set(j.id, s);
  }
  for (const e of expRows) {
    if (!e.job_id) continue;
    const service = jobToService.get(e.job_id);
    if (!service) continue;
    const cur = byService.get(service) ?? { jobs: 0, revenue: 0, expenses: 0 };
    cur.expenses += (e.amount_cents + e.tax_cents) / 100;
    byService.set(service, cur);
  }

  // Win rate per service.
  const winsByService = new Map<string, { won: number; total: number }>();
  for (const l of leadRows) {
    const s = l.service_type ?? "Other";
    const cur = winsByService.get(s) ?? { won: 0, total: 0 };
    if (l.status === "won" || l.status === "lost") {
      cur.total++;
      if (l.status === "won") cur.won++;
    }
    winsByService.set(s, cur);
  }

  const rows: ServiceRow[] = Array.from(byService.entries()).map(([service, m]) => {
    const profit = m.revenue - m.expenses;
    const wins = winsByService.get(service) ?? { won: 0, total: 0 };
    return {
      service,
      jobs: m.jobs,
      revenue: m.revenue,
      expenses: m.expenses,
      profit,
      margin_pct: m.revenue > 0 ? Math.round((profit / m.revenue) * 100) : 0,
      avg_price: m.jobs > 0 ? m.revenue / m.jobs : 0,
      win_rate: wins.total > 0 ? wins.won / wins.total : 0,
    };
  }).sort((a, b) => b.profit - a.profit);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalProfit  = rows.reduce((s, r) => s + r.profit, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Wrench className="h-3.5 w-3.5" /> Growth · Service Profit</span>
          <h1 className="mt-2 display-h2">
            Which services <em>pay you best</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Per-service revenue, expenses, profit, margin %, win rate, average
            ticket. Lean into the high-margin ones; cut the losers.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Services" value={String(rows.length)} />
        <Stat label="Total revenue" value={`$${Math.round(totalRevenue).toLocaleString()}`} />
        <Stat label="Total profit" value={`$${Math.round(totalProfit).toLocaleString()}`} />
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">By service type</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            Tag your leads/jobs with service types and complete some to see the breakdown.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/70 text-left text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Service</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Jobs</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Avg ticket</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Revenue</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Expenses</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Profit</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Margin</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Win rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((r) => (
                  <tr key={r.service} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3 font-medium">{r.service}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono">{r.jobs}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono">${Math.round(r.avg_price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono">${Math.round(r.revenue).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">${Math.round(r.expenses).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono font-semibold text-emerald-700">${Math.round(r.profit).toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-mono ${r.margin_pct >= 40 ? "text-emerald-700" : r.margin_pct >= 20 ? "" : "text-rose-600"}`}>
                      {r.margin_pct}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono">
                      {r.win_rate > 0 ? `${(r.win_rate * 100).toFixed(0)}%` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40">
        <div className="flex items-start gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" />
          <p className="text-ink-700">
            <strong>Heuristic:</strong> raise prices on services with 40%+ margin
            and high win rate (you&apos;re leaving money on the table). Cut or
            outsource services with margin below 20%.
          </p>
        </div>
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
