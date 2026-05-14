import { redirect } from "next/navigation";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface EmpLink { employee_id: string; hourly_rate_cents: number | null; }
interface TimeEntry {
  employee_id: string;
  job_id: string | null;
  clock_in_at: string;
  clock_out_at: string | null;
}
interface JobLite { id: string; price: number | null; status: string; }

interface EmpRow {
  empId: string;
  name: string;
  rate_cents: number;
  hours_total: number;
  hours_on_completed: number;
  payroll: number;
  job_revenue_share: number;
  profit_contribution: number;
  hourly_revenue: number;
}

export default async function EmployeeProfitabilityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ninetyDays = new Date(Date.now() - 90 * 86_400_000).toISOString();

  const [{ data: links }, { data: entries }, { data: jobs }] = await Promise.all([
    supabase.from("employee_links")
      .select("employee_id,hourly_rate_cents")
      .eq("contractor_id", user.id).eq("status", "active"),
    supabase.from("time_entries")
      .select("employee_id,job_id,clock_in_at,clock_out_at")
      .eq("contractor_id", user.id)
      .gte("clock_in_at", ninetyDays)
      .not("clock_out_at", "is", null),
    supabase.from("jobs")
      .select("id,price,status")
      .eq("user_id", user.id).eq("status", "completed")
      .gte("updated_at", ninetyDays),
  ]);

  const linkList = (links ?? []) as EmpLink[];
  const entryList = (entries ?? []) as TimeEntry[];
  const jobList = (jobs ?? []) as JobLite[];

  const jobPrice = new Map(jobList.map((j) => [j.id, j.price ?? 0]));

  // Total hours per job → revenue share per employee.
  const jobHours = new Map<string, number>();
  for (const e of entryList) {
    if (!e.job_id || !e.clock_out_at) continue;
    const hrs = (new Date(e.clock_out_at).getTime() - new Date(e.clock_in_at).getTime()) / 3_600_000;
    if (hrs <= 0) continue;
    jobHours.set(e.job_id, (jobHours.get(e.job_id) ?? 0) + hrs);
  }

  // Names
  const empIds = linkList.map((l) => l.employee_id);
  const empNames = new Map<string, string>();
  if (empIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles").select("id,full_name,email").in("id", empIds);
    for (const p of (profs ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
      empNames.set(p.id, p.full_name ?? p.email ?? p.id.slice(0, 8));
    }
  }

  const rows: EmpRow[] = linkList.map((link) => {
    const myEntries = entryList.filter((e) => e.employee_id === link.employee_id);
    let hours_total = 0;
    let hours_on_completed = 0;
    let job_revenue_share = 0;

    for (const e of myEntries) {
      if (!e.clock_out_at) continue;
      const hrs = (new Date(e.clock_out_at).getTime() - new Date(e.clock_in_at).getTime()) / 3_600_000;
      if (hrs <= 0) continue;
      hours_total += hrs;
      if (!e.job_id) continue;
      const totalHrsOnJob = jobHours.get(e.job_id) ?? 0;
      const price = jobPrice.get(e.job_id);
      if (price == null) continue;
      hours_on_completed += hrs;
      if (totalHrsOnJob > 0) {
        job_revenue_share += price * (hrs / totalHrsOnJob);
      }
    }
    const rate = link.hourly_rate_cents ?? 0;
    const payroll = (hours_total * rate) / 100;
    const profit_contribution = job_revenue_share - payroll;
    const hourly_revenue = hours_on_completed > 0 ? job_revenue_share / hours_on_completed : 0;
    return {
      empId: link.employee_id,
      name: empNames.get(link.employee_id) ?? link.employee_id.slice(0, 8),
      rate_cents: rate,
      hours_total,
      hours_on_completed,
      payroll,
      job_revenue_share,
      profit_contribution,
      hourly_revenue,
    };
  }).filter((r) => r.hours_total > 0)
    .sort((a, b) => b.profit_contribution - a.profit_contribution);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Trophy className="h-3.5 w-3.5" /> Team · Profitability</span>
          <h1 className="mt-2 display-h2">
            Who&apos;s your <em>most profitable</em> employee?
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Last 90 days. Pro-rates each completed-job&apos;s revenue across
            the people who clocked time on it. Profit contribution =
            their share of revenue minus their payroll cost.
          </p>
        </div>
      </header>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Ranked by profit contribution</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            Need active employees + clocked time + completed jobs to score.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50/70 text-left text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">#</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Employee</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Hours</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Rate</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Revenue share</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Payroll</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Profit</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Rev/hr</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r, i) => (
                <tr key={r.empId} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 text-ink-400 tabular-nums font-mono">{i + 1}</td>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono">{r.hours_total.toFixed(0)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">
                    {r.rate_cents > 0 ? `$${(r.rate_cents / 100).toFixed(0)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono">${Math.round(r.job_revenue_share).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">${Math.round(r.payroll).toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-mono font-semibold ${r.profit_contribution >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    ${Math.round(r.profit_contribution).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono">${Math.round(r.hourly_revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
