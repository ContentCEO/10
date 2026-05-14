import { redirect } from "next/navigation";
import { TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Invoice { amount_cents: number; paid_at: string | null; }

export default async function DailyRevenuePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cutoff = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: rows } = await supabase
    .from("invoices")
    .select("amount_cents,paid_at")
    .eq("user_id", user.id).eq("status", "paid")
    .gte("paid_at", cutoff);

  const paid = (rows ?? []) as Invoice[];

  // 90 daily buckets.
  const buckets: { label: string; date: string; revenue: number; count: number }[] = [];
  const now = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    buckets.push({
      label: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
      date: d.toISOString().slice(0, 10),
      revenue: 0, count: 0,
    });
  }

  for (const inv of paid) {
    if (!inv.paid_at) continue;
    const day = inv.paid_at.slice(0, 10);
    const b = buckets.find((x) => x.date === day);
    if (b) { b.revenue += inv.amount_cents / 100; b.count++; }
  }

  const totalRevenue = buckets.reduce((s, b) => s + b.revenue, 0);
  const avgPerDay = totalRevenue / 90;
  const max = Math.max(1, ...buckets.map((b) => b.revenue));
  const bestDay = [...buckets].sort((a, b) => b.revenue - a.revenue)[0];

  // 7-day rolling average for the line overlay
  const rolling = buckets.map((_, i) => {
    const start = Math.max(0, i - 6);
    const slice = buckets.slice(start, i + 1);
    return slice.reduce((s, x) => s + x.revenue, 0) / slice.length;
  });
  const rollingMax = Math.max(1, ...rolling);

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><TrendingUp className="h-3.5 w-3.5" /> Growth · Daily Revenue</span>
          <h1 className="mt-2 display-h2">
            Every day of <em>cash in</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Last 90 days. Daily bars are paid-invoice totals. The line is
            the 7-day rolling average — gives you the real trend even
            when individual days swing.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Total (90d)" value={`$${Math.round(totalRevenue).toLocaleString()}`} />
        <Stat label="Average / day" value={`$${Math.round(avgPerDay).toLocaleString()}`} />
        <Stat label="Best day"
              value={bestDay && bestDay.revenue > 0 ? `$${Math.round(bestDay.revenue).toLocaleString()} on ${bestDay.label}` : "—"} />
      </section>

      <section className="card p-5">
        <div className="relative h-48 flex items-end gap-px">
          {buckets.map((b, i) => (
            <div key={b.date} className="flex-1 flex flex-col items-center gap-0 relative h-full" title={`${b.date}: $${b.revenue.toFixed(2)} (${b.count} inv)`}>
              <div className="w-full bg-brand-gradient rounded-t-sm mt-auto"
                style={{ height: `${(b.revenue / max) * 100}%`, minHeight: b.revenue > 0 ? "2px" : "0" }} />
              {/* 7d rolling overlay marker */}
              <div className="absolute w-1 h-1 rounded-full bg-amber-500" style={{
                bottom: `${(rolling[i] / rollingMax) * 100}%`,
                left: "50%", transform: "translateX(-50%)",
              }} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-ink-400 mt-2 font-mono">
          <span>{buckets[0].label}</span>
          <span>{buckets[30].label}</span>
          <span>{buckets[60].label}</span>
          <span>{buckets[89].label}</span>
        </div>
        <div className="text-[10px] text-ink-500 mt-2 flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-sm bg-brand-gradient" /> Daily
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" /> 7-day rolling avg
          </span>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="mt-1 text-xl tabular-nums font-mono text-ink-900">{value}</div>
    </div>
  );
}
