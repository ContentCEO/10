import { redirect } from "next/navigation";
import { Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface LeadCreated { created_at: string; }

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default async function LeadHeatmapPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ninetyDays = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: rows } = await supabase
    .from("leads")
    .select("created_at")
    .eq("user_id", user.id)
    .gte("created_at", ninetyDays);

  const leads = (rows ?? []) as LeadCreated[];

  // Grid: 7 days × 24 hours
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const l of leads) {
    const d = new Date(l.created_at);
    grid[d.getDay()][d.getHours()]++;
  }

  const max = Math.max(1, ...grid.flat());

  // Day totals + hour totals for the margins
  const dayTotals = grid.map((row) => row.reduce((s, n) => s + n, 0));
  const hourTotals = HOURS.map((h) => grid.reduce((s, row) => s + row[h], 0));
  const maxDay = Math.max(1, ...dayTotals);
  const maxHour = Math.max(1, ...hourTotals);

  // Peak insights
  let peakDay = 0; let peakHour = 0; let peakCount = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (grid[d][h] > peakCount) {
        peakCount = grid[d][h]; peakDay = d; peakHour = h;
      }
    }
  }

  function cellTone(count: number) {
    const pct = count / max;
    if (count === 0) return "bg-ink-50";
    if (pct < 0.2) return "bg-brand-100";
    if (pct < 0.4) return "bg-brand-200";
    if (pct < 0.6) return "bg-brand-400 text-white";
    if (pct < 0.8) return "bg-brand-500 text-white";
    return "bg-brand-700 text-white";
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Calendar className="h-3.5 w-3.5" /> Growth · Lead Heat-Map</span>
          <h1 className="mt-2 display-h2">
            When do leads <em>arrive</em>?
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Last 90 days, every lead grouped by day-of-week and hour-of-day.
            Tells you when to be at your phone — and when you can step away.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="Total leads (90d)" value={String(leads.length)} />
        <Stat label="Peak hour" value={`${DAYS[peakDay]} ${peakHour}:00`} />
        <Stat label="Leads in peak hour" value={String(peakCount)} />
      </section>

      <section className="card p-5 overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Header row: hours */}
          <div className="grid grid-cols-[60px_repeat(24,1fr)_60px] gap-px text-[10px] text-ink-500 font-mono mb-1">
            <div />
            {HOURS.map((h) => (
              <div key={h} className="text-center tabular-nums">{h % 3 === 0 ? h : ""}</div>
            ))}
            <div className="text-right">Total</div>
          </div>

          {/* 7 rows */}
          {DAYS.map((day, di) => (
            <div key={day} className="grid grid-cols-[60px_repeat(24,1fr)_60px] gap-px mb-px">
              <div className="text-[10px] font-mono text-ink-600 flex items-center">{day}</div>
              {HOURS.map((h) => (
                <div key={h}
                  className={`h-6 text-[9px] flex items-center justify-center tabular-nums font-mono ${cellTone(grid[di][h])}`}
                  title={`${day} ${h}:00 — ${grid[di][h]} lead${grid[di][h] === 1 ? "" : "s"}`}>
                  {grid[di][h] > 0 ? grid[di][h] : ""}
                </div>
              ))}
              <div className="text-[10px] font-mono text-ink-600 text-right flex items-center justify-end">
                <div className="w-full">
                  <div className="bg-brand-300 h-1.5 rounded" style={{ width: `${(dayTotals[di] / maxDay) * 100}%` }} />
                  <div className="tabular-nums">{dayTotals[di]}</div>
                </div>
              </div>
            </div>
          ))}

          {/* Footer: hour totals */}
          <div className="grid grid-cols-[60px_repeat(24,1fr)_60px] gap-px mt-2 text-[9px] text-ink-500 font-mono">
            <div />
            {HOURS.map((h) => (
              <div key={h} className="text-center">
                <div className="bg-violet-300 h-1.5 rounded mx-auto" style={{ width: `${(hourTotals[h] / maxHour) * 100}%` }} />
                <div className="tabular-nums">{hourTotals[h] || ""}</div>
              </div>
            ))}
            <div />
          </div>
        </div>
      </section>

      <section className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40 text-sm">
        <p>
          <strong>Tactic:</strong> staff your response window for {DAYS[peakDay]} {peakHour}:00–{(peakHour + 2) % 24}:00.
          That&apos;s your highest-density inbound period. Use auto-replies
          outside it; be on the phone inside it.
        </p>
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
