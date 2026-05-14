import { redirect } from "next/navigation";
import { MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface LeadRow {
  status: string;
  price: number | null;
  customer_id: string | null;
}
interface CustZip { id: string; address: string | null; }

function extractZip(addr: string | null): string | null {
  if (!addr) return null;
  const m = addr.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}

interface ZipRow {
  zip: string;
  leads: number;
  won: number;
  lost: number;
  open: number;
  win_rate: number;
  won_revenue: number;
}

export default async function ZipPerformancePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const yearAgo = new Date(Date.now() - 365 * 86_400_000).toISOString();

  const [{ data: leads }, { data: customers }] = await Promise.all([
    supabase.from("leads").select("status,price,customer_id")
      .eq("user_id", user.id).gte("created_at", yearAgo),
    supabase.from("customers").select("id,address").eq("user_id", user.id),
  ]);

  const leadRows = (leads ?? []) as LeadRow[];
  const custRows = (customers ?? []) as CustZip[];
  const zipByCust = new Map(custRows.map((c) => [c.id, extractZip(c.address)]));

  const agg = new Map<string, { leads: number; won: number; lost: number; open: number; won_revenue: number }>();
  for (const l of leadRows) {
    const zip = l.customer_id ? zipByCust.get(l.customer_id) : null;
    if (!zip) continue;
    const cur = agg.get(zip) ?? { leads: 0, won: 0, lost: 0, open: 0, won_revenue: 0 };
    cur.leads++;
    if (l.status === "won") { cur.won++; cur.won_revenue += l.price ?? 0; }
    else if (l.status === "lost") cur.lost++;
    else cur.open++;
    agg.set(zip, cur);
  }

  const rows: ZipRow[] = Array.from(agg.entries()).map(([zip, v]) => ({
    zip,
    leads: v.leads,
    won: v.won,
    lost: v.lost,
    open: v.open,
    win_rate: v.won + v.lost > 0 ? v.won / (v.won + v.lost) : 0,
    won_revenue: v.won_revenue,
  })).sort((a, b) => b.won_revenue - a.won_revenue);

  const totalLeads = rows.reduce((s, r) => s + r.leads, 0);
  const totalRev = rows.reduce((s, r) => s + r.won_revenue, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><MapPin className="h-3.5 w-3.5" /> Growth · ZIP Performance</span>
          <h1 className="mt-2 display-h2">
            Which <em>ZIP codes</em> pay you best
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Last 12 months, leads grouped by the customer&apos;s ZIP. Lean
            advertising into top-performing ZIPs. Drop the ones that
            ghost.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Stat label="ZIPs with leads" value={String(rows.length)} />
        <Stat label="Total leads (12mo)" value={String(totalLeads)} />
        <Stat label="Total won revenue" value={`$${Math.round(totalRev).toLocaleString()}`} />
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Ranked by revenue</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            Need customers with addresses (containing 5-digit ZIPs) linked to
            leads. Use the customer detail page to add addresses.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50/70 text-left text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">ZIP</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Leads</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Won</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Lost</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Open</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Win %</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((r) => (
                <tr key={r.zip} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-mono font-medium">{r.zip}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono">{r.leads}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono text-emerald-700">{r.won}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono text-rose-700">{r.lost}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">{r.open}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono">{(r.win_rate * 100).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right tabular-nums font-mono font-semibold">
                    ${Math.round(r.won_revenue).toLocaleString()}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="mt-1 text-2xl tabular-nums font-mono text-ink-900">{value}</div>
    </div>
  );
}
