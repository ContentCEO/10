import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowUp, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface JobRow {
  id: string;
  title: string;
  price: number | null;
  cost_estimate_cents: number | null;
  cost_actual_cents: number | null;
  status: string;
}
interface ExpRow {
  job_id: string | null;
  amount_cents: number;
  tax_cents: number;
}

interface VarianceRow {
  id: string;
  title: string;
  price: number;
  estimated: number;
  actual: number;
  variance: number;
  variance_pct: number;
  status: string;
}

export default async function CostVariancePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: jobs }, { data: expenses }] = await Promise.all([
    supabase.from("jobs")
      .select("id,title,price,cost_estimate_cents,cost_actual_cents,status")
      .eq("user_id", user.id)
      .not("cost_estimate_cents", "is", null)
      .gt("cost_estimate_cents", 0),
    supabase.from("job_expenses")
      .select("job_id,amount_cents,tax_cents")
      .eq("user_id", user.id),
  ]);

  const jobRows = (jobs ?? []) as JobRow[];
  const expRows = (expenses ?? []) as ExpRow[];

  // Roll up tracked expenses per job (for jobs that don't have
  // cost_actual_cents set explicitly).
  const expByJob = new Map<string, number>();
  for (const e of expRows) {
    if (!e.job_id) continue;
    expByJob.set(e.job_id, (expByJob.get(e.job_id) ?? 0) + e.amount_cents + e.tax_cents);
  }

  const rows: VarianceRow[] = jobRows.map((j) => {
    const estimated = (j.cost_estimate_cents ?? 0) / 100;
    const actual = j.cost_actual_cents != null
      ? j.cost_actual_cents / 100
      : (expByJob.get(j.id) ?? 0) / 100;
    const variance = actual - estimated;
    const variance_pct = estimated > 0 ? (variance / estimated) * 100 : 0;
    return {
      id: j.id,
      title: j.title,
      price: j.price ?? 0,
      estimated,
      actual,
      variance,
      variance_pct,
      status: j.status,
    };
  }).filter((r) => r.actual > 0);

  rows.sort((a, b) => b.variance_pct - a.variance_pct);
  const over = rows.filter((r) => r.variance > 0);
  const under = rows.filter((r) => r.variance < 0);

  const overTotal = over.reduce((s, r) => s + r.variance, 0);
  const underTotal = under.reduce((s, r) => s + Math.abs(r.variance), 0);
  const avgVariancePct = rows.length > 0
    ? rows.reduce((s, r) => s + r.variance_pct, 0) / rows.length
    : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Scale className="h-3.5 w-3.5" /> Growth · Cost Variance</span>
          <h1 className="mt-2 display-h2">
            Are you <em>under-estimating</em>?
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Every job where you set an estimated cost, compared to actual
            spend. Consistent over-runs mean you&apos;re too optimistic in
            quotes — add buffer, raise prices.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Jobs measured"     value={String(rows.length)} />
        <Stat label="Over budget"       value={String(over.length)}  negative={over.length > under.length} />
        <Stat label="Under budget"      value={String(under.length)} positive={under.length > over.length} />
        <Stat label="Avg variance"      value={`${avgVariancePct >= 0 ? "+" : ""}${avgVariancePct.toFixed(0)}%`}
              negative={avgVariancePct > 5} positive={avgVariancePct < -5} />
      </section>

      <section className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-rose-700 font-semibold flex items-center gap-1">
              <ArrowUp className="h-3 w-3" /> Total over-run
            </div>
            <div className="text-xl tabular-nums font-mono text-rose-700 font-semibold">
              ${Math.round(overTotal).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold flex items-center gap-1">
              <ArrowDown className="h-3 w-3" /> Total under-run
            </div>
            <div className="text-xl tabular-nums font-mono text-emerald-700 font-semibold">
              ${Math.round(underTotal).toLocaleString()}
            </div>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <h2 className="font-semibold">Sorted by over-run % (worst first)</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            Set <code className="bg-ink-100 px-1 rounded">cost_estimate</code> on
            some jobs and log expenses — variance shows up here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/70 text-left text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Job</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Price</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Estimated</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Actual</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Variance</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((r) => {
                  const tone = r.variance_pct > 25 ? "text-rose-700 font-semibold"
                    : r.variance_pct > 10 ? "text-amber-700"
                    : r.variance_pct < -10 ? "text-emerald-700"
                    : "text-ink-700";
                  return (
                    <tr key={r.id} className="hover:bg-brand-50/40">
                      <td className="px-4 py-3">
                        <Link href={`/jobs/${r.id}`} className="font-medium hover:text-brand-600">
                          {r.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono">${r.price.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">${r.estimated.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-mono">${r.actual.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right tabular-nums font-mono ${tone}`}>
                        {r.variance >= 0 ? "+" : ""}${Math.round(r.variance).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-mono ${tone}`}>
                        {r.variance_pct >= 0 ? "+" : ""}{r.variance_pct.toFixed(0)}%
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

function Stat({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className={`mt-1 text-2xl tabular-nums font-mono ${
        positive ? "text-emerald-700" : negative ? "text-rose-700" : "text-ink-900"}`}>
        {value}
      </div>
    </div>
  );
}
