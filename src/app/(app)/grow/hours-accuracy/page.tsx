import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface JobRow {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
}
interface EntryRow {
  job_id: string | null;
  clock_in_at: string;
  clock_out_at: string | null;
}

interface AccuracyRow {
  id: string;
  title: string;
  estimated_hours: number;
  actual_hours: number;
  variance: number;
  variance_pct: number;
}

export default async function HoursAccuracyPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: jobs }, { data: entries }] = await Promise.all([
    supabase.from("jobs")
      .select("id,title,status,start_date,end_date")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .not("start_date", "is", null)
      .not("end_date", "is", null)
      .limit(500),
    supabase.from("time_entries")
      .select("job_id,clock_in_at,clock_out_at")
      .eq("contractor_id", user.id)
      .not("job_id", "is", null)
      .not("clock_out_at", "is", null)
      .limit(5000),
  ]);

  const jobRows = (jobs ?? []) as JobRow[];
  const entryRows = (entries ?? []) as EntryRow[];

  // Actual hours per job from time_entries.
  const actualByJob = new Map<string, number>();
  for (const e of entryRows) {
    if (!e.job_id || !e.clock_out_at) continue;
    const ms = new Date(e.clock_out_at).getTime() - new Date(e.clock_in_at).getTime();
    if (ms <= 0) continue;
    actualByJob.set(e.job_id, (actualByJob.get(e.job_id) ?? 0) + ms / 3_600_000);
  }

  const rows: AccuracyRow[] = jobRows
    .map((j) => {
      const estimatedMs = new Date(j.end_date!).getTime() - new Date(j.start_date!).getTime();
      // Treat estimated_hours as scheduled-day-length × 8h to ignore weekends/nights:
      // simpler: estimated_hours = days × 8.
      const estimatedDays = Math.max(1, Math.round(estimatedMs / 86_400_000));
      const estimated_hours = estimatedDays * 8;
      const actual_hours = actualByJob.get(j.id) ?? 0;
      const variance = actual_hours - estimated_hours;
      const variance_pct = estimated_hours > 0 ? (variance / estimated_hours) * 100 : 0;
      return { id: j.id, title: j.title, estimated_hours, actual_hours, variance, variance_pct };
    })
    .filter((r) => r.actual_hours > 0)
    .sort((a, b) => b.variance_pct - a.variance_pct);

  const avgVariancePct = rows.length > 0
    ? rows.reduce((s, r) => s + r.variance_pct, 0) / rows.length
    : 0;
  const over = rows.filter((r) => r.variance > 0).length;
  const under = rows.filter((r) => r.variance < 0).length;

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Clock className="h-3.5 w-3.5" /> Growth · Hours Accuracy</span>
          <h1 className="mt-2 display-h2">
            Did the work take <em>longer than you said</em>?
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Estimated hours from your scheduled date range (days × 8h)
            vs actual clocked time. Big over-runs mean your bids are
            too optimistic. Big under-runs mean you&apos;re overcharging on
            duration — possibly leaving money on the table.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Jobs analyzed" value={String(rows.length)} />
        <Stat label="Over time"     value={String(over)}  negative={over > under} />
        <Stat label="Under time"    value={String(under)} positive={under > over} />
        <Stat label="Avg variance"  value={`${avgVariancePct >= 0 ? "+" : ""}${avgVariancePct.toFixed(0)}%`}
              negative={avgVariancePct > 5} positive={avgVariancePct < -5} />
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Worst over-runs first</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            Need completed jobs with start/end dates AND time_entries to compare.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50/70 text-left text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Job</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Estimated h</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Actual h</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Variance</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r) => {
                const tone = r.variance_pct > 25 ? "text-rose-700 font-semibold"
                  : r.variance_pct > 10 ? "text-amber-700"
                  : r.variance_pct < -10 ? "text-emerald-700" : "text-ink-700";
                return (
                  <tr key={r.id} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3">
                      <Link href={`/jobs/${r.id}`} className="font-medium hover:text-brand-600">{r.title}</Link>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">{r.estimated_hours.toFixed(0)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono">{r.actual_hours.toFixed(1)}</td>
                    <td className={`px-4 py-3 text-right tabular-nums font-mono ${tone}`}>
                      {r.variance >= 0 ? "+" : ""}{r.variance.toFixed(1)} h
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-mono ${tone}`}>
                      {r.variance_pct >= 0 ? "+" : ""}{r.variance_pct.toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
