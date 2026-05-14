import { redirect } from "next/navigation";
import { Gauge, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Lead {
  status: string;
  created_at: string;
  updated_at: string;
  estimate_sent_at: string | null;
  first_responded_at: string | null;
  price: number | null;
}

export default async function VelocityPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sixtyDays = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const { data: rows } = await supabase
    .from("leads")
    .select("status,created_at,updated_at,estimate_sent_at,first_responded_at,price")
    .eq("user_id", user.id)
    .gte("created_at", sixtyDays);
  const leads = (rows ?? []) as Lead[];

  // Stage transition times.
  const respTimes: number[] = []; // create → first response (hours)
  const estTimes: number[]  = []; // create → estimate sent (hours)
  const winTimes: number[]  = []; // estimate sent → won (days)
  for (const l of leads) {
    const created = new Date(l.created_at).getTime();
    if (l.first_responded_at) {
      respTimes.push((new Date(l.first_responded_at).getTime() - created) / 3_600_000);
    }
    if (l.estimate_sent_at) {
      estTimes.push((new Date(l.estimate_sent_at).getTime() - created) / 3_600_000);
    }
    if (l.status === "won" && l.estimate_sent_at) {
      winTimes.push((new Date(l.updated_at).getTime() - new Date(l.estimate_sent_at).getTime()) / 86_400_000);
    }
  }

  const median = (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  };

  const medianResp = median(respTimes);
  const medianEst  = median(estTimes);
  const medianWin  = median(winTimes);

  // Daily new-lead counts for the last 30 days (sparkline)
  const daily: { day: string; count: number; revenue: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const start = d.toISOString();
    const end = new Date(d.getTime() + 86_400_000).toISOString();
    const dayLeads = leads.filter((l) => l.created_at >= start && l.created_at < end);
    const revenue = dayLeads.filter((l) => l.status === "won").reduce((s, l) => s + (l.price ?? 0), 0);
    daily.push({
      day: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
      count: dayLeads.length,
      revenue,
    });
  }
  const maxCount = Math.max(1, ...daily.map((d) => d.count));

  // Conversion funnel
  const total       = leads.length;
  const contacted   = leads.filter((l) => l.first_responded_at).length;
  const estimated   = leads.filter((l) => l.estimate_sent_at).length;
  const won         = leads.filter((l) => l.status === "won").length;

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Gauge className="h-3.5 w-3.5" /> Growth · Sales Velocity</span>
          <h1 className="mt-2 display-h2">
            How fast deals <em>move</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Last 60 days. Median response time, estimate time, and time-to-close —
            plus the conversion funnel and daily lead volume.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Time to first response" value={medianResp ? `${medianResp.toFixed(1)} hr` : "—"}
              note={medianResp < 1 ? "Excellent · under 1hr" : medianResp < 4 ? "Good · same business hour" : "Slow · cut this in half"} />
        <Stat label="Time to estimate" value={medianEst ? `${(medianEst / 24).toFixed(1)} d` : "—"}
              note={medianEst < 24 ? "Excellent · same day" : medianEst < 72 ? "OK · within 3 days" : "Slow · price-shopper risk"} />
        <Stat label="Estimate → Won" value={medianWin ? `${medianWin.toFixed(1)} d` : "—"}
              note={medianWin < 7 ? "Hot pipeline" : medianWin < 21 ? "Healthy" : "Long sales cycle"} />
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-600" /> Funnel (last 60 days)
        </h2>
        <ul className="space-y-2">
          {[
            { label: "Leads created", n: total },
            { label: "Responded to", n: contacted },
            { label: "Estimated",    n: estimated },
            { label: "Won",          n: won },
          ].map((row, i) => {
            const pct = total > 0 ? (row.n / total) * 100 : 0;
            const prev = i > 0 ? (i === 1 ? total : i === 2 ? contacted : estimated) : null;
            const stepPct = prev != null && prev > 0 ? (row.n / prev) * 100 : 100;
            return (
              <li key={row.label}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>{row.label}</span>
                  <span className="tabular-nums font-mono">
                    <strong>{row.n}</strong>
                    {prev != null && (
                      <span className="text-ink-500 text-xs ml-2">({stepPct.toFixed(0)}% of prev)</span>
                    )}
                  </span>
                </div>
                <div className="h-2 bg-ink-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3">Daily leads (last 30d)</h2>
        <div className="flex items-end gap-0.5 h-32">
          {daily.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5 group relative">
              <div className="w-full bg-brand-gradient rounded-t-sm transition-all"
                style={{ height: `${(d.count / maxCount) * 100}%`, minHeight: d.count > 0 ? "2px" : "1px" }}
                title={`${d.day}: ${d.count} leads${d.revenue > 0 ? ` · $${Math.round(d.revenue).toLocaleString()}` : ""}`} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-ink-400 mt-1 font-mono">
          <span>{daily[0].day}</span>
          <span>{daily[Math.floor(daily.length / 2)].day}</span>
          <span>{daily[daily.length - 1].day}</span>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="mt-1 text-3xl tabular-nums font-mono text-ink-900">{value}</div>
      {note && <div className="mt-1 text-[11px] text-ink-500">{note}</div>}
    </div>
  );
}
