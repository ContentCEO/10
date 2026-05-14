import { redirect } from "next/navigation";
import Link from "next/link";
import { Calendar as CalendarIcon, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface LeadRow {
  id: string;
  name: string;
  status: string;
  service_type: string | null;
  price: number | null;
  estimate_sent_at: string | null;
}

export default async function EstimatesCalendarPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ninetyDays = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: rows } = await supabase
    .from("leads")
    .select("id,name,status,service_type,price,estimate_sent_at")
    .eq("user_id", user.id)
    .not("estimate_sent_at", "is", null)
    .gte("estimate_sent_at", ninetyDays)
    .order("estimate_sent_at", { ascending: false })
    .limit(500);

  const estimates = (rows ?? []) as LeadRow[];

  // Day-of-week distribution
  const dayCounts = Array(7).fill(0);
  for (const e of estimates) {
    if (e.estimate_sent_at) {
      dayCounts[new Date(e.estimate_sent_at).getDay()]++;
    }
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxDay = Math.max(1, ...dayCounts);

  // Outstanding (sent but not yet won/lost)
  const outstanding = estimates.filter((e) => e.status !== "won" && e.status !== "lost");
  const wonValue = estimates.filter((e) => e.status === "won").reduce((s, e) => s + (e.price ?? 0), 0);
  const outstandingValue = outstanding.reduce((s, e) => s + (e.price ?? 0), 0);

  // Group by week
  const weekGroups = new Map<string, LeadRow[]>();
  for (const e of estimates) {
    if (!e.estimate_sent_at) continue;
    const d = new Date(e.estimate_sent_at);
    // ISO week start (Monday)
    const day = (d.getDay() + 6) % 7;
    const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    const key = monday.toISOString().slice(0, 10);
    if (!weekGroups.has(key)) weekGroups.set(key, []);
    weekGroups.get(key)!.push(e);
  }
  const weeks = Array.from(weekGroups.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 12);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><CalendarIcon className="h-3.5 w-3.5" /> Pipeline · Estimates Calendar</span>
          <h1 className="mt-2 display-h2">
            Every <em>estimate sent</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Last 90 days, grouped by week. Outstanding ones (sent but
            not yet decided) need follow-up energy.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Estimates sent (90d)" value={String(estimates.length)} />
        <Stat label="Outstanding"          value={`${outstanding.length} · $${Math.round(outstandingValue).toLocaleString()}`} />
        <Stat label="Won so far"           value={`$${Math.round(wonValue).toLocaleString()}`} accent />
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3">When you send estimates</h2>
        <div className="space-y-1.5">
          {days.map((d, i) => (
            <div key={d} className="flex items-center gap-3">
              <span className="text-[10px] font-mono text-ink-500 w-8 shrink-0">{d}</span>
              <div className="flex-1 h-5 bg-ink-100 rounded-md overflow-hidden">
                <div className="h-full bg-brand-gradient" style={{ width: `${(dayCounts[i] / maxDay) * 100}%` }} />
              </div>
              <span className="text-xs tabular-nums font-mono shrink-0 w-8 text-right">{dayCounts[i]}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">By week</h2>
        </div>
        {weeks.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">No estimates sent in the last 90 days.</div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {weeks.map(([wk, items]) => {
              const weekStart = new Date(wk);
              const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
              const weekValue = items.reduce((s, e) => s + (e.price ?? 0), 0);
              const wonCount = items.filter((i) => i.status === "won").length;
              return (
                <li key={wk} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-semibold">
                      {weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" – "}
                      {weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div className="text-xs text-ink-500 tabular-nums font-mono">
                      {items.length} sent
                      {wonCount > 0 && <span className="text-emerald-700 ml-2">· {wonCount} won</span>}
                      {weekValue > 0 && <span className="ml-2">· ${Math.round(weekValue).toLocaleString()}</span>}
                    </div>
                  </div>
                  <ul className="divide-y divide-ink-100">
                    {items.map((e) => (
                      <li key={e.id} className="py-1.5 flex items-center gap-3">
                        <FileText className="h-3 w-3 text-ink-400 shrink-0" />
                        <Link href={`/leads/${e.id}`} className="text-sm font-medium hover:text-brand-600 truncate flex-1">
                          {e.name}
                          {e.service_type && <span className="ml-1 text-ink-500 font-normal">· {e.service_type}</span>}
                        </Link>
                        <span className={`badge ${
                          e.status === "won" ? "bg-emerald-100 text-emerald-700 ring-emerald-200" :
                          e.status === "lost" ? "bg-rose-100 text-rose-700 ring-rose-200" :
                          "bg-amber-100 text-amber-700 ring-amber-200"
                        }`}>
                          {e.status === "estimate_sent" ? "outstanding" : e.status}
                        </span>
                        <span className="text-xs tabular-nums font-mono w-20 text-right shrink-0">
                          {e.price ? `$${e.price.toLocaleString()}` : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`card p-4 ${accent ? "bg-gradient-to-br from-emerald-50/60 via-white to-white" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className={`mt-1 text-2xl tabular-nums font-mono ${accent ? "text-emerald-700 font-semibold" : "text-ink-900"}`}>
        {value}
      </div>
    </div>
  );
}
