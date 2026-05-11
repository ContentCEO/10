import { TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Job, Lead } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type Row = {
  source: string;
  leads: number;
  won: number;
  revenue: number;
  conversion: number;
};

export async function SourceRoi() {
  const supabase = createClient();
  const [{ data: leads }, { data: jobs }] = await Promise.all([
    supabase.from("leads").select("source,status,id"),
    supabase.from("jobs").select("lead_id,price,status"),
  ]);

  const revenueByLead = new Map<string, number>();
  ((jobs ?? []) as Pick<Job, "lead_id" | "price" | "status">[]).forEach((j) => {
    if (!j.lead_id || j.status === "cancelled") return;
    revenueByLead.set(j.lead_id, (revenueByLead.get(j.lead_id) ?? 0) + (j.price ?? 0));
  });

  const map = new Map<string, Row>();
  ((leads ?? []) as Pick<Lead, "source" | "status" | "id">[]).forEach((l) => {
    const source = l.source?.trim() || "Unknown";
    const row = map.get(source) ?? {
      source, leads: 0, won: 0, revenue: 0, conversion: 0,
    };
    row.leads += 1;
    if (l.status === "won") row.won += 1;
    row.revenue += revenueByLead.get(l.id) ?? 0;
    map.set(source, row);
  });

  const rows = Array.from(map.values()).map((r) => ({
    ...r,
    conversion: r.leads > 0 ? Math.round((r.won / r.leads) * 100) : 0,
  }));
  rows.sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-600" />
          Source ROI
        </h2>
        <span className="text-xs text-slate-500">All-time</span>
      </div>
      {rows.length ? (
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500 text-left">
              <th className="font-medium py-1.5">Source</th>
              <th className="font-medium py-1.5 text-right">Leads</th>
              <th className="font-medium py-1.5 text-right">Won</th>
              <th className="font-medium py-1.5 text-right hidden sm:table-cell">Conv.</th>
              <th className="font-medium py-1.5 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.source}>
                <td className="py-2 font-medium truncate max-w-[160px]">{r.source}</td>
                <td className="py-2 text-right">{r.leads}</td>
                <td className="py-2 text-right">{r.won}</td>
                <td className="py-2 text-right hidden sm:table-cell">{r.conversion}%</td>
                <td className="py-2 text-right font-medium">{formatCurrency(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-4 text-sm text-slate-500 text-center">
          No source data yet. Add a `source` to your leads to see what's working.
        </p>
      )}
    </div>
  );
}
