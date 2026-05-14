import { redirect } from "next/navigation";
import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Invoice { amount_cents: number; status: string; due_at: string | null; paid_at: string | null; }
interface Job { price: number | null; status: string; start_date: string | null; end_date: string | null; }
interface Expense { amount_cents: number; tax_cents: number; spent_at: string; }
interface Customer { recurring_active: boolean; recurring_price: number | null; recurring_frequency: string | null; recurring_next_at: string | null; }

const FREQ_DAYS: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30, quarterly: 90 };

export default async function CashFlowPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const ninetyAgo = new Date(now.getTime() - 90 * 86_400_000).toISOString();

  const [{ data: invs }, { data: jobs }, { data: exps }, { data: custs }] = await Promise.all([
    supabase.from("invoices")
      .select("amount_cents,status,due_at,paid_at")
      .eq("user_id", user.id),
    supabase.from("jobs")
      .select("price,status,start_date,end_date")
      .eq("user_id", user.id)
      .in("status", ["scheduled", "in_progress"]),
    supabase.from("job_expenses")
      .select("amount_cents,tax_cents,spent_at")
      .eq("user_id", user.id)
      .gte("spent_at", ninetyAgo.slice(0, 10)),
    supabase.from("customers")
      .select("recurring_active,recurring_price,recurring_frequency,recurring_next_at")
      .eq("user_id", user.id).eq("recurring_active", true),
  ]);

  const invoices = (invs ?? []) as Invoice[];
  const jobList = (jobs ?? []) as Job[];
  const expenses = (exps ?? []) as Expense[];
  const customers = (custs ?? []) as Customer[];

  // Cash IN — projected (next 90 days)
  const projectedIn: { window: string; amount: number; sources: string[] }[] = [
    { window: "0-30 days",  amount: 0, sources: [] },
    { window: "30-60 days", amount: 0, sources: [] },
    { window: "60-90 days", amount: 0, sources: [] },
  ];

  function bucket(daysOut: number): number {
    if (daysOut < 0) return -1; // overdue or past
    if (daysOut < 30) return 0;
    if (daysOut < 60) return 1;
    if (daysOut < 90) return 2;
    return -1;
  }

  // Outstanding invoices (sent + draft) by due_at
  let overdueAmount = 0;
  let overdueCount = 0;
  for (const i of invoices) {
    if (i.status === "paid" || i.status === "void") continue;
    if (!i.due_at) continue;
    const daysOut = (new Date(i.due_at).getTime() - now.getTime()) / 86_400_000;
    if (daysOut < 0) {
      overdueAmount += i.amount_cents / 100;
      overdueCount++;
      continue;
    }
    const b = bucket(daysOut);
    if (b >= 0) {
      projectedIn[b].amount += i.amount_cents / 100;
      const src = "Invoices due";
      if (!projectedIn[b].sources.includes(src)) projectedIn[b].sources.push(src);
    }
  }

  // Scheduled jobs (price) by start_date
  for (const j of jobList) {
    if (!j.price || !j.start_date) continue;
    const daysOut = (new Date(j.start_date).getTime() - now.getTime()) / 86_400_000;
    const b = bucket(daysOut);
    if (b >= 0) {
      projectedIn[b].amount += j.price * 0.7; // 70% probability of timely payment
      const src = "Scheduled jobs (×0.7)";
      if (!projectedIn[b].sources.includes(src)) projectedIn[b].sources.push(src);
    }
  }

  // Recurring revenue projections
  for (const c of customers) {
    if (!c.recurring_active || !c.recurring_price || !c.recurring_frequency || !c.recurring_next_at) continue;
    const freqDays = FREQ_DAYS[c.recurring_frequency];
    if (!freqDays) continue;
    let t = new Date(c.recurring_next_at).getTime();
    const end = now.getTime() + 90 * 86_400_000;
    while (t <= end) {
      const daysOut = (t - now.getTime()) / 86_400_000;
      const b = bucket(daysOut);
      if (b >= 0) {
        projectedIn[b].amount += c.recurring_price;
        const src = "Recurring services";
        if (!projectedIn[b].sources.includes(src)) projectedIn[b].sources.push(src);
      }
      t += freqDays * 86_400_000;
    }
  }

  // Cash OUT — based on rolling 90d average daily expense
  const last90ExpenseTotal = expenses.reduce((s, e) => s + (e.amount_cents + e.tax_cents) / 100, 0);
  const dailyBurn = last90ExpenseTotal / 90;
  const outBuckets = [30, 30, 30].map((days) => dailyBurn * days);

  const net = projectedIn.map((p, i) => p.amount - outBuckets[i]);
  const cumNet = net.reduce((acc, n, i) => {
    acc.push((acc[i - 1] ?? 0) + n);
    return acc;
  }, [] as number[]);

  const total90In  = projectedIn.reduce((s, p) => s + p.amount, 0);
  const total90Out = outBuckets.reduce((s, n) => s + n, 0);
  const total90Net = total90In - total90Out;

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Wallet className="h-3.5 w-3.5" /> Growth · Cash Flow</span>
          <h1 className="mt-2 display-h2">
            What&apos;s <em>coming in</em>, what&apos;s going out
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            30/60/90-day projection. Cash in = outstanding invoices + scheduled
            jobs (weighted 70%) + recurring revenue. Cash out = 90-day rolling
            daily burn rate, projected forward.
          </p>
        </div>
      </header>

      {overdueCount > 0 && (
        <section className="card p-4 bg-rose-50 ring-1 ring-rose-200">
          <div className="text-sm text-rose-800">
            ⚠️ <strong>${Math.round(overdueAmount).toLocaleString()}</strong> across{" "}
            <strong>{overdueCount}</strong> overdue invoice{overdueCount === 1 ? "" : "s"} —
            collect these before counting on projections.
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="90-day in"  value={`$${Math.round(total90In).toLocaleString()}`}  tone="emerald" icon={<TrendingUp className="h-3 w-3" />} />
        <Stat label="90-day out" value={`$${Math.round(total90Out).toLocaleString()}`} tone="rose"    icon={<TrendingDown className="h-3 w-3" />} />
        <Stat label="Net"        value={`$${Math.round(total90Net).toLocaleString()}`} tone={total90Net >= 0 ? "emerald" : "rose"} accent />
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">By window</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-ink-50/70 text-left text-ink-500">
            <tr>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Window</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Cash in</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Cash out</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Net</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Running</th>
              <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Sources</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {projectedIn.map((p, i) => (
              <tr key={i} className="hover:bg-brand-50/40">
                <td className="px-4 py-3 font-medium">{p.window}</td>
                <td className="px-4 py-3 text-right tabular-nums font-mono text-emerald-700">${Math.round(p.amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-right tabular-nums font-mono text-rose-700">${Math.round(outBuckets[i]).toLocaleString()}</td>
                <td className={`px-4 py-3 text-right tabular-nums font-mono font-semibold ${net[i] >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  ${Math.round(net[i]).toLocaleString()}
                </td>
                <td className={`px-4 py-3 text-right tabular-nums font-mono ${cumNet[i] >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  ${Math.round(cumNet[i]).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-xs text-ink-500">
                  {p.sources.join(", ") || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40 text-sm">
        <p>
          <strong>Burn rate:</strong> <span className="font-mono tabular-nums">${Math.round(dailyBurn).toLocaleString()}</span>/day based on last 90 days
          of tracked expenses. Log every receipt at <Link className="text-brand-600 font-semibold hover:underline" href="/expenses">/expenses</Link> for
          this to be accurate.
        </p>
      </section>
    </div>
  );
}

import Link from "next/link";

function Stat({ label, value, tone, accent, icon }: {
  label: string; value: string; tone: "emerald" | "rose" | "ink"; accent?: boolean; icon?: React.ReactNode;
}) {
  const colorClass = tone === "emerald" ? "text-emerald-700"
    : tone === "rose" ? "text-rose-700"
    : "text-ink-900";
  return (
    <div className={`card p-4 ${accent ? "bg-gradient-to-br from-brand-50/60 via-white to-white" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold flex items-center gap-1">
        {icon}{label}
      </div>
      <div className={`mt-1 text-2xl tabular-nums font-mono ${colorClass} ${accent ? "font-semibold" : ""}`}>
        {value}
      </div>
    </div>
  );
}
