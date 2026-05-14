import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface OpenEntry { id: string; job_id: string | null; clock_in_at: string; }
interface JobLite { id: string; title: string; status: string; }

async function clockIn(jobId: string | null) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: link } = await supabase
    .from("employee_links").select("contractor_id")
    .eq("employee_id", user.id).eq("status", "active").limit(1).single();
  if (!link) return;
  await supabase.from("time_entries")
    .update({ clock_out_at: new Date().toISOString() })
    .eq("employee_id", user.id).is("clock_out_at", null);
  await supabase.from("time_entries").insert({
    employee_id: user.id,
    contractor_id: link.contractor_id,
    job_id: jobId,
  });
  revalidatePath("/work/kiosk");
}

async function clockOut() {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("time_entries")
    .update({ clock_out_at: new Date().toISOString() })
    .eq("employee_id", user.id).is("clock_out_at", null);
  revalidatePath("/work/kiosk");
}

function fmtElapsed(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

export default async function KioskPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: link } = await supabase
    .from("employee_links").select("contractor_id")
    .eq("employee_id", user.id).eq("status", "active").limit(1).maybeSingle();

  if (!link) {
    return (
      <div className="fixed inset-0 bg-ink-50 flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">No active contractor link</h1>
          <p className="text-sm text-ink-500 mt-2">Ask your employer for an invite code.</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const [{ data: openEntry }, { data: todayJobs }, { data: profile }] = await Promise.all([
    supabase.from("time_entries")
      .select("id,job_id,clock_in_at")
      .eq("employee_id", user.id).is("clock_out_at", null).maybeSingle(),
    supabase.from("jobs")
      .select("id,title,status")
      .eq("user_id", link.contractor_id)
      .in("status", ["scheduled", "in_progress"])
      .gte("start_date", startOfDay).lt("start_date", endOfDay),
    supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle(),
  ]);

  const entry = openEntry as OpenEntry | null;
  const jobs = (todayJobs ?? []) as JobLite[];
  const me = (profile ?? null) as { full_name: string | null; email: string | null } | null;
  const myName = me?.full_name ?? me?.email ?? "Worker";

  const onJob = entry?.job_id ? jobs.find((j) => j.id === entry.job_id) : null;
  const elapsedMs = entry ? Date.now() - new Date(entry.clock_in_at).getTime() : 0;

  return (
    <div className="fixed inset-0 bg-ink-50 overflow-y-auto">
      <header className="bg-white border-b border-ink-200/70 sticky top-0">
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Crew kiosk</div>
            <h1 className="text-lg font-serif text-ink-900">{myName}</h1>
          </div>
          <div className="text-right tabular-nums font-mono text-sm text-ink-500">
            {today.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            <div className="text-[10px]">{today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-8 space-y-6">
        {entry ? (
          <section className="card p-6 sm:p-8 text-center bg-gradient-to-br from-emerald-50 to-emerald-100 ring-1 ring-emerald-200">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-emerald-800 mb-2 inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> Clocked in
            </div>
            <div className="text-5xl font-mono tabular-nums font-bold text-emerald-900">
              {fmtElapsed(elapsedMs)}
            </div>
            {onJob && (
              <div className="mt-3 text-sm text-emerald-800">
                on <strong>{onJob.title}</strong>
              </div>
            )}
            <form action={clockOut} className="mt-6">
              <button type="submit" className="w-full px-8 py-4 rounded-2xl bg-rose-600 text-white font-bold text-lg shadow-soft hover:bg-rose-700 active:scale-[0.98] transition">
                Clock OUT
              </button>
            </form>
          </section>
        ) : (
          <section className="card p-6 text-center">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-ink-500 mb-1">
              Not clocked in
            </div>
            <p className="text-sm text-ink-600">Tap a job below to clock in. Or clock in without a job.</p>
            <form action={clockIn.bind(null, null)} className="mt-4">
              <button type="submit" className="px-6 py-3 rounded-xl bg-brand-gradient text-white font-semibold shadow-soft hover:scale-[1.02] transition">
                Clock IN (no job)
              </button>
            </form>
          </section>
        )}

        <section>
          <h2 className="text-sm font-semibold text-ink-700 uppercase tracking-wider mb-3">Today&apos;s jobs</h2>
          {jobs.length === 0 ? (
            <div className="card p-6 text-center text-sm text-ink-500 italic">No jobs scheduled today.</div>
          ) : (
            <ul className="space-y-2">
              {jobs.map((j) => {
                const active = entry?.job_id === j.id;
                return (
                  <li key={j.id}>
                    <form action={clockIn.bind(null, j.id)}>
                      <button
                        type="submit"
                        disabled={active}
                        className={`w-full text-left p-5 rounded-2xl ring-1 transition active:scale-[0.99] ${
                          active
                            ? "bg-emerald-100 ring-emerald-300 cursor-default"
                            : "bg-white ring-ink-200 hover:ring-brand-300 hover:bg-brand-50"
                        }`}>
                        <div className="text-base font-semibold">{j.title}</div>
                        <div className="text-xs text-ink-500 mt-0.5">
                          {active ? "Active — clocked in here" : `tap to clock in${entry ? " (will close current shift)" : ""}`}
                        </div>
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <footer className="text-center pt-4">
          <Link href="/work" className="text-xs text-ink-400 hover:text-ink-600">← back to /work</Link>
        </footer>
      </main>
    </div>
  );
}
