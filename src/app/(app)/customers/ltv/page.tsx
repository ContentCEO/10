import { redirect } from "next/navigation";
import Link from "next/link";
import { Crown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Customer { id: string; name: string; created_at: string; }
interface JobLite  { customer_id: string | null; price: number | null; status: string; }
interface ExpLite  { job_id: string | null; amount_cents: number; tax_cents: number; }
interface JobLink  { id: string; customer_id: string | null; }

interface LtvRow {
  id: string;
  name: string;
  jobs_completed: number;
  revenue: number;
  expenses: number;
  profit: number;
  margin_pct: number;
  customer_since: string;
}

export default async function LtvPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: customers }, { data: jobs }, { data: jobLinks }, { data: expenses }] = await Promise.all([
    supabase.from("customers").select("id,name,created_at").eq("user_id", user.id),
    supabase.from("jobs").select("customer_id,price,status,id").eq("user_id", user.id).eq("status", "completed"),
    supabase.from("jobs").select("id,customer_id").eq("user_id", user.id),
    supabase.from("job_expenses").select("job_id,amount_cents,tax_cents").eq("user_id", user.id),
  ]);

  const custList = (customers ?? []) as Customer[];
  const completedJobs = (jobs ?? []) as JobLite[];
  const allJobs = (jobLinks ?? []) as JobLink[];
  const expList = (expenses ?? []) as ExpLite[];

  const jobToCustomer = new Map(allJobs.map((j) => [j.id, j.customer_id]));

  const expByCustomer = new Map<string, number>();
  for (const e of expList) {
    if (!e.job_id) continue;
    const customerId = jobToCustomer.get(e.job_id);
    if (!customerId) continue;
    expByCustomer.set(customerId, (expByCustomer.get(customerId) ?? 0) + e.amount_cents + e.tax_cents);
  }

  const rows: LtvRow[] = custList.map((c) => {
    const myJobs = completedJobs.filter((j) => j.customer_id === c.id);
    const revenue = myJobs.reduce((s, j) => s + (j.price ?? 0), 0);
    const expenses = (expByCustomer.get(c.id) ?? 0) / 100;
    const profit = revenue - expenses;
    const margin_pct = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
    return {
      id: c.id,
      name: c.name,
      jobs_completed: myJobs.length,
      revenue,
      expenses,
      profit,
      margin_pct,
      customer_since: c.created_at,
    };
  }).filter((r) => r.jobs_completed > 0)
    .sort((a, b) => b.profit - a.profit);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalProfit  = rows.reduce((s, r) => s + r.profit,  0);
  const avgLtv = rows.length > 0 ? totalProfit / rows.length : 0;
  const top10 = rows.slice(0, 10);
  const top10Revenue = top10.reduce((s, r) => s + r.revenue, 0);
  const top10Pct = totalRevenue > 0 ? (top10Revenue / totalRevenue) * 100 : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Crown className="h-3.5 w-3.5" /> Customers · Lifetime Value</span>
          <h1 className="mt-2 display-h2">
            Who are your <em>best customers</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Ranked by total profit (revenue minus tracked expenses). The
            top 10 here usually drive most of the business — give them
            white-glove service.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <Stat label="Customers w/ jobs" value={String(rows.length)} />
        <Stat label="Total revenue"     value={`$${Math.round(totalRevenue).toLocaleString()}`} />
        <Stat label="Total profit"      value={`$${Math.round(totalProfit).toLocaleString()}`} />
        <Stat label="Avg LTV"           value={`$${Math.round(avgLtv).toLocaleString()}`} />
      </section>

      {top10Pct > 0 && (
        <section className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            <span>
              Top 10 customers drive{" "}
              <span className="font-semibold tabular-nums font-mono">{top10Pct.toFixed(0)}%</span>
              {" "}of revenue (${Math.round(top10Revenue).toLocaleString()}).
            </span>
          </div>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Ranked by profit</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            No completed jobs yet. LTV shows up once jobs ship.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/70 text-left text-ink-500">
                <tr>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">#</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Customer</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Jobs</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Revenue</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Expenses</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Profit</th>
                  <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.map((r, i) => (
                  <tr key={r.id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3 text-ink-400 tabular-nums font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/customers/${r.id}`} className="font-medium hover:text-brand-600">
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono">{r.jobs_completed}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono">${Math.round(r.revenue).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">${Math.round(r.expenses).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono font-semibold text-emerald-700">${Math.round(r.profit).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono">{r.margin_pct}%</td>
                  </tr>
                ))}
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
