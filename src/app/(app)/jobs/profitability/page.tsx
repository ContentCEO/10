import { redirect } from "next/navigation";
import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface JobRow {
  id: string;
  title: string;
  status: string;
  price: number | null;
  cost_estimate_cents: number | null;
  cost_actual_cents: number | null;
  updated_at: string;
}
interface ExpRow { job_id: string | null; amount_cents: number; tax_cents: number; }
interface SubAssign { job_id: string | null; payout_cents: number; }

interface ProfitRow {
  id: string;
  title: string;
  price: number;
  materials: number;
  labor: number;
  subs: number;
  total_cost: number;
  profit: number;
  margin_pct: number;
  status: string;
}

export default async function JobProfitabilityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: jobs }, { data: expenses }, { data: subs }] = await Promise.all([
    supabase.from("jobs")
      .select("id,title,status,price,cost_estimate_cents,cost_actual_cents,updated_at")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .not("price", "is", null)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase.from("job_expenses")
      .select("job_id,kind,amount_cents,tax_cents")
      .eq("user_id", user.id),
    supabase.from("subcontractor_assignments")
      .select("job_id,payout_cents")
      .eq("user_id", user.id),
  ]);

  const jobRows = (jobs ?? []) as JobRow[];
  const expRows = (expenses ?? []) as Array<ExpRow & { kind: string }>;
  const subRows = (subs ?? []) as SubAssign[];

  const materialsByJob = new Map<string, number>();
  const laborByJob = new Map<string, number>();
  for (const e of expRows) {
    if (!e.job_id) continue;
    const total = (e.amount_cents + e.tax_cents) / 100;
    if (e.kind === "material") {
      materialsByJob.set(e.job_id, (materialsByJob.get(e.job_id) ?? 0) + total);
    } else {
      laborByJob.set(e.job_id, (laborByJob.get(e.job_id) ?? 0) + total);
    }
  }
  const subsByJob = new Map<string, number>();
  for (const s of subRows) {
    if (!s.job_id) continue;
    subsByJob.set(s.job_id, (subsByJob.get(s.job_id) ?? 0) + s.payout_cents / 100);
  }

  const rows: ProfitRow[] = jobRows.map((j) => {
    const price = j.price ?? 0;
    const materials = materialsByJob.get(j.id) ?? 0;
    const labor = laborByJob.get(j.id) ?? 0;
    const subsAmt = subsByJob.get(j.id) ?? 0;
    const total_cost = materials + labor + subsAmt;
    const profit = price - total_cost;
    const margin_pct = price > 0 ? (profit / price) * 100 : 0;
    return {
      id: j.id, title: j.title, price, materials, labor, subs: subsAmt,
      total_cost, profit, margin_pct, status: j.status,
    };
  }).sort((a, b) => b.profit - a.profit);

  const totalRev = rows.reduce((s, r) => s + r.price, 0);
  const totalCost = rows.reduce((s, r) => s + r.total_cost, 0);
  const totalProfit = totalRev - totalCost;
  const avgMargin = rows.length > 0
    ? rows.reduce((s, r) => s + r.margin_pct, 0) / rows.length
    : 0;
  const losingJobs = rows.filter((r) => r.profit < 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><BarChart3 className="h-3.5 w-3.5" /> Operations · Job P&amp;L</span>
          <h1 className="mt-2 display-h2">
            Every job&apos;s <em>true profit</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Price minus materials, labor expenses, and subcontractor payouts.
            Sort by profit. Losing jobs surface at the bottom — figure out
            what went wrong, never quote that scope at that price again.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Jobs"            value={String(rows.length)} />
        <Stat label="Total revenue"   value={`$${Math.round(totalRev).toLocaleString()}`} />
        <Stat label="Total profit"    value={`$${Math.round(totalProfit).toLocaleString()}`} accent />
        <Stat label="Avg margin"      value={`${avgMargin.toFixed(0)}%`}
              negative={avgMargin < 25} positive={avgMargin >= 40} />
      </section>

      {losingJobs.length > 0 && (
        <section className="card p-4 bg-rose-50 ring-1 ring-rose-200">
          <div className="text-sm text-rose-800">
            <strong>{losingJobs.length} losing job{losingJobs.length === 1 ? "" : "s"}</strong>:
            costs exceeded price. Click into each to see line-item breakdown.
          </div>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Per-job breakdown</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            No completed jobs with price set yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/70 text-left text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Job</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Price</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Materials</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Labor/exp</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Subs</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Total cost</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Profit</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((r) => {
                  const tone = r.margin_pct < 0 ? "text-rose-700 font-semibold"
                    : r.margin_pct < 20 ? "text-amber-700"
                    : r.margin_pct >= 40 ? "text-emerald-700 font-semibold"
                    : "text-ink-700";
                  return (
                    <tr key={r.id} className="hover:bg-brand-50/40">
                      <td className="px-4 py-3">
                        <Link href={`/jobs/${r.id}`} className="font-medium hover:text-brand-600">{r.title}</Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono">${Math.round(r.price).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">${Math.round(r.materials).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">${Math.round(r.labor).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">${Math.round(r.subs).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-700">${Math.round(r.total_cost).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-mono ${tone}`}>${Math.round(r.profit).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-mono ${tone}`}>{r.margin_pct.toFixed(0)}%</td>
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

function Stat({ label, value, accent, positive, negative }: {
  label: string; value: string; accent?: boolean; positive?: boolean; negative?: boolean;
}) {
  return (
    <div className={`card p-4 ${accent ? "bg-gradient-to-br from-emerald-50/60 via-white to-white" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className={`mt-1 text-2xl tabular-nums font-mono ${
        positive ? "text-emerald-700" :
        negative ? "text-rose-700" :
        accent ? "text-emerald-700 font-semibold" : "text-ink-900"
      }`}>
        {value}
      </div>
    </div>
  );
}
