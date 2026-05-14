import { redirect } from "next/navigation";
import Link from "next/link";
import { Repeat, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Recurring revenue forecast. Projects the next 12 months of jobs
// auto-generated from customers with active recurring schedules.
// Shows MRR, by-customer breakdown, and ASCII bar chart of the
// next 12 monthly slots.

interface CustRow {
  id: string;
  name: string;
  recurring_active: boolean;
  recurring_frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | null;
  recurring_service: string | null;
  recurring_price: number | null;
  recurring_next_at: string | null;
}

const FREQ_DAYS: Record<string, number> = {
  weekly: 7, biweekly: 14, monthly: 30, quarterly: 90,
};
const FREQ_PER_MONTH: Record<string, number> = {
  weekly: 30 / 7, biweekly: 30 / 14, monthly: 1, quarterly: 1 / 3,
};

export default async function RecurringRevenuePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("customers")
    .select("id,name,recurring_active,recurring_frequency,recurring_service,recurring_price,recurring_next_at")
    .eq("user_id", user.id)
    .eq("recurring_active", true)
    .not("recurring_frequency", "is", null)
    .order("name");

  const active = (rows ?? []) as CustRow[];

  // Estimated MRR = sum across active customers of (price × visits/month).
  const mrr = active.reduce((s, c) => {
    if (!c.recurring_frequency || !c.recurring_price) return s;
    return s + c.recurring_price * (FREQ_PER_MONTH[c.recurring_frequency] ?? 0);
  }, 0);

  // Project the next 12 months — bucket each customer's visits into
  // the month they'd fall in.
  const months: { label: string; revenue: number }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      label: d.toLocaleString("en-US", { month: "short" }),
      revenue: 0,
    });
  }
  const horizonMs = 365 * 86_400_000;
  for (const c of active) {
    if (!c.recurring_frequency || !c.recurring_price || !c.recurring_next_at) continue;
    const freqDays = FREQ_DAYS[c.recurring_frequency];
    if (!freqDays) continue;
    let t = new Date(c.recurring_next_at).getTime();
    const end = now.getTime() + horizonMs;
    while (t <= end) {
      const visit = new Date(t);
      const monthsFromNow = (visit.getFullYear() - now.getFullYear()) * 12 + visit.getMonth() - now.getMonth();
      if (monthsFromNow >= 0 && monthsFromNow < 12) {
        months[monthsFromNow].revenue += c.recurring_price;
      }
      t += freqDays * 86_400_000;
    }
  }

  const maxMonth = Math.max(1, ...months.map((m) => m.revenue));
  const next12 = months.reduce((s, m) => s + m.revenue, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Repeat className="h-3.5 w-3.5" /> Growth · Recurring Revenue</span>
          <h1 className="mt-2 display-h2">
            Money on <em>autopilot</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Every customer with an active recurring schedule, projected
            forward 12 months. This is the floor under your business —
            jobs that happen even if you sell nothing new.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Active</div>
          <div className="mt-1 text-3xl tabular-nums font-mono text-ink-900">{active.length}</div>
          <div className="mt-1 text-xs text-ink-500">recurring customers</div>
        </div>
        <div className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">MRR</div>
          <div className="mt-1 text-3xl tabular-nums font-mono text-ink-900">
            ${Math.round(mrr).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-ink-500">monthly recurring revenue</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Next 12 mo</div>
          <div className="mt-1 text-3xl tabular-nums font-mono text-ink-900">
            ${Math.round(next12).toLocaleString()}
          </div>
          <div className="mt-1 text-xs text-ink-500">projected total</div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-600" /> 12-month projection
        </h2>
        <div className="space-y-1.5">
          {months.map((m, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-[10px] uppercase tracking-wider text-ink-500 font-mono w-8 shrink-0">{m.label}</span>
              <div className="flex-1 h-5 bg-ink-100 rounded-md overflow-hidden">
                <div className="h-full bg-brand-gradient transition-all"
                  style={{ width: `${(m.revenue / maxMonth) * 100}%` }} />
              </div>
              <span className="text-xs tabular-nums font-mono shrink-0 w-20 text-right">
                ${Math.round(m.revenue).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Recurring customers</h2>
        </div>
        {active.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            No recurring schedules yet. Enable on a customer&apos;s page to add one.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {active.map((c) => {
              const ppm = c.recurring_frequency
                ? (c.recurring_price ?? 0) * (FREQ_PER_MONTH[c.recurring_frequency] ?? 0)
                : 0;
              return (
                <li key={c.id} className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-gradient text-white flex items-center justify-center font-semibold text-sm shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-ink-500 truncate">
                        {c.recurring_service ?? "—"} · {c.recurring_frequency}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm tabular-nums font-mono font-semibold">
                        ${c.recurring_price?.toFixed(0) ?? "0"}/visit
                      </div>
                      <div className="text-[10px] text-ink-500 tabular-nums">
                        ≈ ${Math.round(ppm)}/mo
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
