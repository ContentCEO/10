import { redirect } from "next/navigation";
import { Award, ThumbsDown, ThumbsUp, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Lead {
  status: string;
  service_type: string | null;
  source: string | null;
  win_loss_reason: string | null;
  price: number | null;
  estimate_sent_at: string | null;
  updated_at: string;
}

function normReason(s: string | null): string {
  if (!s) return "(no reason)";
  return s.trim().toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80) || "(no reason)";
}

export default async function WinLossPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ninetyDays = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const { data: rows } = await supabase
    .from("leads")
    .select("status,service_type,source,win_loss_reason,price,estimate_sent_at,updated_at")
    .eq("user_id", user.id)
    .in("status", ["won", "lost"])
    .gte("updated_at", ninetyDays);

  const leads = (rows ?? []) as Lead[];
  const won = leads.filter((l) => l.status === "won");
  const lost = leads.filter((l) => l.status === "lost");
  const totalDecided = won.length + lost.length;
  const winRate = totalDecided > 0 ? won.length / totalDecided : 0;

  // Top loss reasons
  const lossReasons = new Map<string, number>();
  for (const l of lost) {
    const r = normReason(l.win_loss_reason);
    lossReasons.set(r, (lossReasons.get(r) ?? 0) + 1);
  }
  const topLossReasons = [...lossReasons.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Top win reasons
  const winReasons = new Map<string, number>();
  for (const l of won) {
    const r = normReason(l.win_loss_reason);
    winReasons.set(r, (winReasons.get(r) ?? 0) + 1);
  }
  const topWinReasons = [...winReasons.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Average time-to-close (estimate_sent_at → won status)
  const closeTimes = won
    .filter((l) => l.estimate_sent_at)
    .map((l) => (new Date(l.updated_at).getTime() - new Date(l.estimate_sent_at!).getTime()) / 86_400_000)
    .filter((d) => d > 0 && d < 365);
  const avgCloseDays = closeTimes.length > 0
    ? closeTimes.reduce((s, d) => s + d, 0) / closeTimes.length
    : null;

  // Lost revenue
  const lostRevenue = lost.reduce((s, l) => s + (l.price ?? 0), 0);
  const wonRevenue  = won.reduce((s, l) => s + (l.price ?? 0), 0);

  // Loss rate by service
  const svcAgg = new Map<string, { won: number; lost: number; lostValue: number }>();
  for (const l of leads) {
    const k = l.service_type ?? "Other";
    const cur = svcAgg.get(k) ?? { won: 0, lost: 0, lostValue: 0 };
    if (l.status === "won")  cur.won++;
    if (l.status === "lost") { cur.lost++; cur.lostValue += l.price ?? 0; }
    svcAgg.set(k, cur);
  }
  const svcRows = [...svcAgg.entries()]
    .map(([service, v]) => ({
      service,
      ...v,
      winRate: v.won + v.lost > 0 ? v.won / (v.won + v.lost) : 0,
    }))
    .filter((r) => r.won + r.lost >= 2)
    .sort((a, b) => a.winRate - b.winRate);

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Award className="h-3.5 w-3.5" /> Sales · Win/Loss</span>
          <h1 className="mt-2 display-h2">
            Why deals <em>close</em> &mdash; or don&apos;t
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Last 90 days, only leads with a final outcome. Top reasons,
            time-to-close, and which services lose the most.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Win rate"       value={`${(winRate * 100).toFixed(0)}%`} accent />
        <Stat label="Won deals"      value={String(won.length)} />
        <Stat label="Won revenue"    value={`$${Math.round(wonRevenue).toLocaleString()}`} />
        <Stat label="Lost revenue"   value={`$${Math.round(lostRevenue).toLocaleString()}`} negative />
      </section>

      {avgCloseDays != null && (
        <section className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40">
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-brand-600" />
            Avg time from estimate sent → won:{" "}
            <strong className="font-mono tabular-nums">{avgCloseDays.toFixed(1)} days</strong>
            <span className="text-ink-500"> (based on {closeTimes.length} closes)</span>
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="card p-5">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-rose-700">
            <ThumbsDown className="h-4 w-4" /> Top loss reasons
          </h2>
          {topLossReasons.length === 0 ? (
            <div className="text-sm text-ink-500 italic">No lost leads yet.</div>
          ) : (
            <ul className="space-y-2">
              {topLossReasons.map(([reason, count]) => (
                <li key={reason} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate capitalize">{reason}</div>
                    <div className="h-1.5 bg-ink-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-rose-400"
                        style={{ width: `${(count / Math.max(...topLossReasons.map((r) => r[1]))) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm tabular-nums font-mono font-semibold shrink-0">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-emerald-700">
            <ThumbsUp className="h-4 w-4" /> Top win reasons
          </h2>
          {topWinReasons.length === 0 ? (
            <div className="text-sm text-ink-500 italic">No won leads yet.</div>
          ) : (
            <ul className="space-y-2">
              {topWinReasons.map(([reason, count]) => (
                <li key={reason} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate capitalize">{reason}</div>
                    <div className="h-1.5 bg-ink-100 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-emerald-400"
                        style={{ width: `${(count / Math.max(...topWinReasons.map((r) => r[1]))) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm tabular-nums font-mono font-semibold shrink-0">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Services with lowest win rate</h2>
        </div>
        {svcRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            Need more closed leads to break down by service.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50/70 text-left text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Service</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Won</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Lost</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Win %</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Lost $</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {svcRows.map((r) => (
                <tr key={r.service} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-medium">{r.service}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono text-emerald-700">{r.won}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono text-rose-700">{r.lost}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-mono ${r.winRate >= 0.5 ? "" : "text-rose-700"}`}>
                    {(r.winRate * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">
                    ${Math.round(r.lostValue).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, accent, negative }: { label: string; value: string; accent?: boolean; negative?: boolean }) {
  return (
    <div className={`card p-4 ${accent ? "bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className={`mt-1 text-2xl tabular-nums font-mono ${negative ? "text-rose-700" : "text-ink-900"}`}>{value}</div>
    </div>
  );
}
