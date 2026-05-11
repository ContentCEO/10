import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Clock, Hammer, ListChecks, Timer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { DailyTask, EmployeeLink, Job, TimeEntry } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function clockIn(jobId: string | null) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: link } = await supabase
    .from("employee_links").select("contractor_id")
    .eq("employee_id", user.id).eq("status", "active").limit(1).single();
  if (!link) return;
  // Close any previously-open entry first.
  await supabase.from("time_entries")
    .update({ clock_out_at: new Date().toISOString() })
    .eq("employee_id", user.id).is("clock_out_at", null);
  await supabase.from("time_entries").insert({
    employee_id: user.id,
    contractor_id: link.contractor_id,
    job_id: jobId,
  });
  revalidatePath("/work");
}

async function clockOut() {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("time_entries")
    .update({ clock_out_at: new Date().toISOString() })
    .eq("employee_id", user.id).is("clock_out_at", null);
  revalidatePath("/work");
}

async function updateTaskStatus(id: string, status: string) {
  "use server";
  const supabase = createClient();
  const update: { status: string; completed_at: string | null } = {
    status,
    completed_at: status === "done" ? new Date().toISOString() : null,
  };
  await supabase.from("daily_tasks").update(update).eq("id", id);
  revalidatePath("/work");
}

function hoursWorked(entries: TimeEntry[]) {
  let ms = 0;
  for (const e of entries) {
    const start = new Date(e.clock_in_at).getTime();
    const end = e.clock_out_at ? new Date(e.clock_out_at).getTime() : Date.now();
    ms += end - start;
  }
  return ms / 3_600_000;
}

export default async function EmployeeTodayPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const startOfWeek = new Date(today); startOfWeek.setDate(today.getDate() - today.getDay());
  const startOfWeekIso = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate()).toISOString();

  const [
    { data: link },
    { data: openEntry },
    { data: todayEntries },
    { data: weekEntries },
    { data: tasks },
    { data: assignedJobs },
  ] = await Promise.all([
    supabase.from("employee_links").select("*").eq("employee_id", user.id).eq("status", "active").limit(1).maybeSingle(),
    supabase.from("time_entries").select("*").eq("employee_id", user.id).is("clock_out_at", null).order("clock_in_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("time_entries").select("*").eq("employee_id", user.id).gte("clock_in_at", startOfDay),
    supabase.from("time_entries").select("*").eq("employee_id", user.id).gte("clock_in_at", startOfWeekIso),
    supabase.from("daily_tasks").select("*").eq("employee_id", user.id).neq("status", "done").order("due_at"),
    supabase.from("jobs").select("*").in("status", ["scheduled", "in_progress"]).order("start_date").limit(8),
  ]);

  const l = (link as EmployeeLink | null);
  const open = (openEntry as TimeEntry | null);
  const taskList = (tasks ?? []) as DailyTask[];
  const jobList = (assignedJobs ?? []) as Job[];

  if (!l) {
    return (
      <div className="card p-8 text-center space-y-3">
        <h1 className="text-xl font-bold">You're not linked to a contractor yet.</h1>
        <p className="text-sm text-slate-600">
          Ask your employer to send you an invite code, then accept it below.
        </p>
        <form action="/api/employee/redeem-invite" method="post" className="flex max-w-sm mx-auto gap-2">
          <input name="code" required className="input font-mono"
            placeholder="XXXX-XXXX-XXXX" />
          <button className="btn-primary">Redeem</button>
        </form>
      </div>
    );
  }

  const hoursToday = hoursWorked((todayEntries ?? []) as TimeEntry[]);
  const hoursWeek  = hoursWorked((weekEntries ?? []) as TimeEntry[]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-slate-500">
          {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </header>

      <section className="card p-5 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
        <div className="relative flex items-center gap-3 flex-wrap">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow shrink-0">
            <Timer className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider text-slate-500">Status</div>
            <div className="text-2xl font-bold gradient-text">
              {open ? "Clocked in" : "Clocked out"}
            </div>
            {open && (
              <div className="text-xs text-slate-500 mt-0.5">
                Since {new Date(open.clock_in_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">Today</div>
              <div className="text-lg font-bold">{hoursToday.toFixed(1)} h</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-slate-500">This week</div>
              <div className="text-lg font-bold">{hoursWeek.toFixed(1)} h</div>
            </div>
          </div>
          {open ? (
            <form action={clockOut}>
              <button className="btn-danger">Clock out</button>
            </form>
          ) : (
            <form action={clockIn.bind(null, null)}>
              <button className="btn-primary">Clock in</button>
            </form>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <ListChecks className="h-4 w-4" /> Open tasks ({taskList.length})
        </h2>
        {taskList.length > 0 ? (
          <ul className="card divide-y divide-slate-100">
            {taskList.map((t) => (
              <li key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-slate-500">
                    {t.due_at ? `Due ${new Date(t.due_at).toLocaleDateString()}` : "No due date"}
                    {t.notes ? ` · ${t.notes}` : ""}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {t.status === "pending" && (
                    <form action={updateTaskStatus.bind(null, t.id, "in_progress")}>
                      <button className="btn-secondary !py-1 text-xs">Start</button>
                    </form>
                  )}
                  <form action={updateTaskStatus.bind(null, t.id, "done")}>
                    <button className="btn-primary !py-1 text-xs">Done</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-6 text-center text-sm text-slate-500">
            No open tasks. Nice.
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Hammer className="h-4 w-4" /> Active job schedule
        </h2>
        {jobList.length > 0 ? (
          <ul className="card divide-y divide-slate-100">
            {jobList.map((j) => (
              <li key={j.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{j.title}</div>
                  <div className="text-xs text-slate-500">
                    {j.start_date ? `Start ${formatDate(j.start_date)}` : "No start date"}
                    {j.description ? ` · ${j.description.slice(0, 80)}` : ""}
                  </div>
                </div>
                <form action={clockIn.bind(null, j.id)}>
                  <button className="btn-secondary !py-1 text-xs">
                    <Clock className="h-3 w-3" /> Clock in on this job
                  </button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card p-6 text-center text-sm text-slate-500">
            No active jobs scheduled by your contractor right now.
          </div>
        )}
      </section>

      <Link href="/work/tasks" className="block text-center text-sm text-brand-600">
        See all tasks →
      </Link>
    </div>
  );
}
