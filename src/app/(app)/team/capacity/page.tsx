import { redirect } from "next/navigation";
import Link from "next/link";
import { Battery, Hammer, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Job {
  id: string;
  title: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
}
interface Link { employee_id: string; }

const DAILY_HOURS_PER_EMP = 8;

export default async function CapacityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));   // Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const [{ data: jobs }, { data: links }] = await Promise.all([
    supabase.from("jobs")
      .select("id,title,start_date,end_date,status")
      .eq("user_id", user.id)
      .in("status", ["scheduled", "in_progress"])
      .gte("start_date", weekStart.toISOString())
      .lt("start_date", weekEnd.toISOString()),
    supabase.from("employee_links")
      .select("employee_id").eq("contractor_id", user.id).eq("status", "active"),
  ]);

  const jobList = (jobs ?? []) as Job[];
  const empCount = ((links ?? []) as Link[]).length;
  // Always include the owner in capacity headcount.
  const headcount = empCount + 1;

  // Total weekly capacity in person-hours (Mon-Fri).
  const weeklyCapacityHours = headcount * DAILY_HOURS_PER_EMP * 5;

  // Per-job demand: end_date - start_date in calendar days × 8h × 1 worker
  // (heuristic; real demand requires task tracking)
  const demand = jobList.reduce((sum, j) => {
    if (!j.start_date) return sum;
    const start = new Date(j.start_date);
    const end = j.end_date ? new Date(j.end_date) : new Date(start.getTime() + 86_400_000);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));
    return sum + days * 8;
  }, 0);

  const utilization = weeklyCapacityHours > 0 ? (demand / weeklyCapacityHours) * 100 : 0;
  const remaining = Math.max(0, weeklyCapacityHours - demand);
  const tone = utilization < 60 ? "text-emerald-700"
            : utilization < 90 ? "text-amber-700"
            :                    "text-rose-700";

  // Day-by-day breakdown
  const days: { label: string; date: string; jobs: Job[]; hours: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dayStr = d.toISOString().slice(0, 10);
    const inDay = jobList.filter((j) =>
      j.start_date && j.start_date.slice(0, 10) === dayStr);
    days.push({
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: dayStr,
      jobs: inDay,
      hours: inDay.length * 8,
    });
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Battery className="h-3.5 w-3.5" /> Team · Capacity</span>
          <h1 className="mt-2 display-h2">
            How much more <em>can you take</em>?
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Headcount × 8 hours × 5 weekdays = weekly capacity. Demand
            comes from this week&apos;s scheduled jobs. Stay under 90% if
            you want to absorb the inevitable rush.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Headcount"     value={String(headcount)} icon={<Users className="h-3 w-3" />} />
        <Stat label="Capacity / wk" value={`${weeklyCapacityHours} h`} />
        <Stat label="Demand"        value={`${demand} h`} />
        <Stat label="Utilization"   value={`${utilization.toFixed(0)}%`} tone={tone} />
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold">Week-of {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</h2>
          <span className="text-xs text-ink-500">
            <strong className="tabular-nums font-mono">{remaining}</strong> hours free
          </span>
        </div>
        <div className="h-4 bg-ink-100 rounded-full overflow-hidden mb-3">
          <div className={`h-full ${
            utilization < 60 ? "bg-emerald-500" :
            utilization < 90 ? "bg-amber-500" :
                               "bg-rose-500"
          }`} style={{ width: `${Math.min(100, utilization)}%` }} />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((d, i) => {
            const dayUtil = (d.hours / (headcount * DAILY_HOURS_PER_EMP)) * 100;
            return (
              <div key={i} className="card p-2 text-center">
                <div className="text-[10px] uppercase text-ink-500 font-semibold">{d.label}</div>
                <div className="text-xs tabular-nums font-mono mt-1">
                  {d.jobs.length} job{d.jobs.length === 1 ? "" : "s"}
                </div>
                <div className="text-[10px] text-ink-400 tabular-nums font-mono">
                  {dayUtil.toFixed(0)}%
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">This week&apos;s jobs</h2>
        </div>
        {jobList.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">No jobs scheduled this week.</div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {jobList.map((j) => (
              <li key={j.id} className="px-4 py-2.5 flex items-center gap-3">
                <Hammer className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                <Link href={`/jobs/${j.id}`} className="flex-1 truncate hover:text-brand-600 text-sm font-medium">
                  {j.title}
                </Link>
                <span className="text-xs text-ink-500 tabular-nums font-mono">
                  {j.start_date && new Date(j.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {utilization >= 90 && (
        <section className="card p-4 bg-rose-50 ring-1 ring-rose-200 text-sm text-rose-800">
          <strong>Booked solid.</strong> Anything new this week needs to
          either bump a job, add overtime, or get scheduled into next week.
        </section>
      )}
      {utilization < 40 && headcount > 1 && (
        <section className="card p-4 bg-amber-50 ring-1 ring-amber-200 text-sm text-amber-800">
          <strong>Light week.</strong> Time to push lead-gen or call dormant customers.
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, icon, tone }: { label: string; value: string; icon?: React.ReactNode; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold flex items-center gap-1">
        {icon}{label}
      </div>
      <div className={`mt-1 text-2xl tabular-nums font-mono ${tone ?? "text-ink-900"}`}>{value}</div>
    </div>
  );
}
