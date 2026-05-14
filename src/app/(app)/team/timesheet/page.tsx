import { redirect } from "next/navigation";
import Link from "next/link";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Entry {
  id: string;
  employee_id: string;
  job_id: string | null;
  clock_in_at: string;
  clock_out_at: string | null;
}
interface EmpLink {
  employee_id: string;
  hourly_rate_cents: number | null;
}
interface JobLite { id: string; title: string; }

function fmtHM(ms: number): string {
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export default async function TimesheetPage({
  searchParams,
}: {
  searchParams?: { week?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolve week window. Default = current week (Mon→Sun).
  const today = new Date();
  const ref = searchParams?.week ? new Date(searchParams.week) : today;
  const dayOfWeek = (ref.getDay() + 6) % 7; // Mon=0
  const weekStart = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [{ data: entries }, { data: links }, { data: jobs }] = await Promise.all([
    supabase.from("time_entries")
      .select("id,employee_id,job_id,clock_in_at,clock_out_at")
      .eq("contractor_id", user.id)
      .gte("clock_in_at", weekStart.toISOString())
      .lt("clock_in_at", weekEnd.toISOString())
      .order("clock_in_at"),
    supabase.from("employee_links")
      .select("employee_id,hourly_rate_cents")
      .eq("contractor_id", user.id),
    supabase.from("jobs").select("id,title").eq("user_id", user.id),
  ]);

  const eRows = (entries ?? []) as Entry[];
  const eLinks = (links ?? []) as EmpLink[];
  const rateById = new Map(eLinks.map((l) => [l.employee_id, l.hourly_rate_cents ?? 0]));
  const jobMap = new Map(((jobs ?? []) as JobLite[]).map((j) => [j.id, j.title]));

  // Aggregate per-employee: ms worked + payroll.
  const totals = new Map<string, { ms: number; payroll: number; entries: number }>();
  for (const e of eRows) {
    const start = new Date(e.clock_in_at).getTime();
    const end = e.clock_out_at ? new Date(e.clock_out_at).getTime() : Date.now();
    const ms = Math.max(0, end - start);
    const rate = rateById.get(e.employee_id) ?? 0;
    const cur = totals.get(e.employee_id) ?? { ms: 0, payroll: 0, entries: 0 };
    cur.ms += ms;
    cur.payroll += (ms / 3_600_000) * rate;
    cur.entries++;
    totals.set(e.employee_id, cur);
  }

  // Fetch employee names for display.
  const empIds = Array.from(totals.keys());
  const empNames = new Map<string, string>();
  if (empIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles").select("id,full_name,email")
      .in("id", empIds);
    for (const p of (profs ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
      empNames.set(p.id, p.full_name ?? p.email ?? "(unknown)");
    }
  }

  const summary = Array.from(totals.entries())
    .map(([empId, t]) => ({
      empId,
      name: empNames.get(empId) ?? empId.slice(0, 8),
      ms: t.ms,
      hours: t.ms / 3_600_000,
      payroll: t.payroll,
      entries: t.entries,
    }))
    .sort((a, b) => b.hours - a.hours);

  const totalMs       = summary.reduce((s, x) => s + x.ms, 0);
  const totalPayroll  = summary.reduce((s, x) => s + x.payroll, 0);

  // Prev / next week links.
  const prev = new Date(weekStart); prev.setDate(prev.getDate() - 7);
  const next = new Date(weekStart); next.setDate(next.getDate() + 7);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Clock className="h-3.5 w-3.5" /> Operations · Timesheet</span>
          <h1 className="mt-2 display-h2">
            Week of <em>{weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Total hours and payroll across every employee for the week.
            Use this to prep payroll runs.
          </p>
          <div className="mt-3 flex gap-2 text-xs">
            <Link href={`/team/timesheet?week=${fmt(prev)}`} className="btn-secondary py-1 px-2">← Prev</Link>
            <Link href="/team/timesheet" className="btn-secondary py-1 px-2">This week</Link>
            <Link href={`/team/timesheet?week=${fmt(next)}`} className="btn-secondary py-1 px-2">Next →</Link>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Active workers" value={String(summary.length)} />
        <Stat label="Total hours"    value={fmtHM(totalMs)} />
        <Stat label="Total payroll"  value={`$${Math.round(totalPayroll / 100).toLocaleString()}`} />
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">By employee</h2>
        </div>
        {summary.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            No time entries this week. Employees clock in from the /work page.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {summary.map((s) => {
              const rateCents = rateById.get(s.empId) ?? 0;
              return (
                <li key={s.empId} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-gradient text-white flex items-center justify-center font-semibold text-sm shrink-0">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-ink-500 tabular-nums">
                      {s.entries} shift{s.entries === 1 ? "" : "s"}
                      {rateCents > 0 && <> · ${(rateCents / 100).toFixed(2)}/hr</>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm tabular-nums font-mono font-semibold">{fmtHM(s.ms)}</div>
                    <div className="text-xs text-ink-500 tabular-nums font-mono">
                      ${(s.payroll / 100).toFixed(2)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">All shifts this week</h2>
        </div>
        {eRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">No shifts.</div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {eRows.map((e) => {
              const start = new Date(e.clock_in_at);
              const end = e.clock_out_at ? new Date(e.clock_out_at) : null;
              const ms = (end ? end.getTime() : Date.now()) - start.getTime();
              return (
                <li key={e.id} className="px-4 py-2.5 flex items-center gap-3 text-xs">
                  <span className="text-ink-500 tabular-nums font-mono w-20 shrink-0">
                    {start.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="text-ink-700 font-medium tabular-nums font-mono shrink-0">
                    {start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    {" – "}
                    {end ? end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "open"}
                  </span>
                  <span className="flex-1 truncate">
                    {empNames.get(e.employee_id) ?? "—"}
                    {e.job_id && jobMap.get(e.job_id) && (
                      <span className="text-ink-500"> · {jobMap.get(e.job_id)}</span>
                    )}
                  </span>
                  <span className="text-ink-700 tabular-nums font-mono shrink-0">{fmtHM(ms)}</span>
                </li>
              );
            })}
          </ul>
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
