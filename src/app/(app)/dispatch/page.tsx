import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, HardHat, Hammer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Job {
  id: string;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
}
interface Entry {
  employee_id: string;
  job_id: string | null;
  clock_in_at: string;
  clock_out_at: string | null;
}
interface Employee { employee_id: string; }

export default async function DispatchPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const [{ data: jobs }, { data: entries }, { data: employees }] = await Promise.all([
    supabase.from("jobs")
      .select("id,title,status,start_date,end_date")
      .eq("user_id", user.id)
      .in("status", ["scheduled", "in_progress"])
      .gte("start_date", today).lt("start_date", tomorrow)
      .order("start_date"),
    supabase.from("time_entries")
      .select("employee_id,job_id,clock_in_at,clock_out_at")
      .eq("contractor_id", user.id)
      .is("clock_out_at", null),
    supabase.from("employee_links")
      .select("employee_id")
      .eq("contractor_id", user.id)
      .eq("status", "active"),
  ]);

  const todayJobs = (jobs ?? []) as Job[];
  const openEntries = (entries ?? []) as Entry[];
  const empList = (employees ?? []) as Employee[];

  // Employee name lookup
  const empIds = empList.map((e) => e.employee_id);
  const empNames = new Map<string, string>();
  if (empIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles").select("id,full_name,email")
      .in("id", empIds);
    for (const p of (profs ?? []) as { id: string; full_name: string | null; email: string | null }[]) {
      empNames.set(p.id, p.full_name ?? p.email ?? p.id.slice(0, 8));
    }
  }

  // Who's clocked in to which job right now
  const clockedToJob = new Map<string, string[]>(); // employee_id -> [job_id]
  for (const e of openEntries) {
    if (!e.job_id) continue;
    if (!clockedToJob.has(e.employee_id)) clockedToJob.set(e.employee_id, []);
    clockedToJob.get(e.employee_id)!.push(e.job_id);
  }

  // Inverse: which employees are on each job
  const jobEmployees = new Map<string, string[]>();
  for (const e of openEntries) {
    if (!e.job_id) continue;
    if (!jobEmployees.has(e.job_id)) jobEmployees.set(e.job_id, []);
    jobEmployees.get(e.job_id)!.push(e.employee_id);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Users className="h-3.5 w-3.5" /> Operations · Dispatch</span>
          <h1 className="mt-2 display-h2">
            Today&apos;s <em>crew</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Who&apos;s clocked in where, what&apos;s scheduled, and who&apos;s available
            for the next call.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <HardHat className="h-4 w-4 text-brand-600" />
            <h2 className="font-semibold">Crew status</h2>
          </div>
          {empList.length === 0 ? (
            <div className="text-sm text-ink-500 italic">No employees yet.</div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {empList.map((e) => {
                const onJobs = clockedToJob.get(e.employee_id) ?? [];
                const onJob = onJobs[0] ? todayJobs.find((j) => j.id === onJobs[0]) : null;
                return (
                  <li key={e.employee_id} className="py-2.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-gradient text-white flex items-center justify-center text-sm font-semibold shrink-0">
                      {(empNames.get(e.employee_id) ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{empNames.get(e.employee_id) ?? "(unknown)"}</div>
                      <div className="text-xs text-ink-500">
                        {onJob ? <>on <Link href={`/jobs/${onJob.id}`} className="text-brand-600 font-medium hover:underline">{onJob.title}</Link></>
                          : onJobs.length > 0 ? "clocked in (job removed)"
                          : <span className="text-emerald-700">available</span>}
                      </div>
                    </div>
                    <span className={`badge ${onJobs.length > 0 ? "bg-amber-100 text-amber-700 ring-amber-200" : "bg-emerald-100 text-emerald-700 ring-emerald-200"}`}>
                      {onJobs.length > 0 ? "busy" : "free"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Hammer className="h-4 w-4 text-brand-600" />
            <h2 className="font-semibold">Today&apos;s jobs</h2>
          </div>
          {todayJobs.length === 0 ? (
            <div className="text-sm text-ink-500 italic">No jobs scheduled today.</div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {todayJobs.map((j) => {
                const onJob = jobEmployees.get(j.id) ?? [];
                return (
                  <li key={j.id} className="py-2.5">
                    <Link href={`/jobs/${j.id}`} className="block">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{j.title}</div>
                          <div className="text-xs text-ink-500">
                            {j.start_date && new Date(j.start_date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            {onJob.length > 0 && (
                              <> · <span className="text-brand-700 font-medium">
                                {onJob.map((id) => empNames.get(id) ?? "?").join(", ")}
                              </span></>
                            )}
                          </div>
                        </div>
                        <span className={`badge shrink-0 ${
                          j.status === "in_progress"
                            ? "bg-amber-100 text-amber-700 ring-amber-200"
                            : "bg-brand-100 text-brand-700 ring-brand-200"
                        }`}>
                          {j.status === "in_progress" ? "active" : "scheduled"}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
