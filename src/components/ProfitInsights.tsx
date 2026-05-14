import { CircleDollarSign, Hammer, TrendingDown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

type JobCostRow = {
  id: string;
  title: string;
  status: string;
  price: number | null;
  cost_estimate_cents: number | null;
  cost_actual_cents: number | null;
};

function dollars(cents: number | null) {
  return cents == null ? null : cents / 100;
}

export async function ProfitInsights() {
  const supabase = createClient();
  const { data } = await supabase
    .from("jobs")
    .select("id,title,status,price,cost_estimate_cents,cost_actual_cents")
    .eq("status", "completed");

  const rows = (data ?? []) as JobCostRow[];
  const withCost = rows
    .map((r) => {
      const cost = dollars(r.cost_actual_cents) ?? dollars(r.cost_estimate_cents);
      if (cost == null || r.price == null) return null;
      const profit = r.price - cost;
      const margin = r.price > 0 ? profit / r.price : 0;
      return { ...r, cost, profit, margin };
    })
    .filter((x): x is JobCostRow & { cost: number; profit: number; margin: number } => x !== null);

  if (withCost.length === 0) return null;

  const totalRevenue = withCost.reduce((s, j) => s + (j.price ?? 0), 0);
  const totalCost    = withCost.reduce((s, j) => s + j.cost, 0);
  const totalProfit  = totalRevenue - totalCost;
  const avgMargin    = withCost.reduce((s, j) => s + j.margin, 0) / withCost.length;

  const best  = [...withCost].sort((a, b) => b.margin - a.margin)[0];
  const worst = [...withCost].sort((a, b) => a.margin - b.margin)[0];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-emerald-600" />
          Profit insights
        </h2>
        <span className="text-xs text-slate-500">
          {withCost.length} of {rows.length} completed jobs tracked
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="Revenue" value={formatCurrency(totalRevenue)} />
        <Stat label="Cost"    value={formatCurrency(totalCost)} />
        <Stat label="Profit"  value={formatCurrency(totalProfit)} tone={totalProfit >= 0 ? "good" : "bad"} />
        <Stat label="Avg margin" value={`${Math.round(avgMargin * 100)}%`}
              tone={avgMargin >= 0.2 ? "good" : avgMargin >= 0 ? "neutral" : "bad"} />
      </div>

      <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
        {best && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="text-xs uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Best margin
            </div>
            <div className="font-medium truncate">{best.title}</div>
            <div className="text-xs text-emerald-900">
              {Math.round(best.margin * 100)}% · {formatCurrency(best.profit)} profit
            </div>
          </div>
        )}
        {worst && best && worst.id !== best.id && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
            <div className="text-xs uppercase tracking-wider text-rose-700 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" /> Tightest margin
            </div>
            <div className="font-medium truncate">{worst.title}</div>
            <div className="text-xs text-rose-900">
              {Math.round(worst.margin * 100)}% · {formatCurrency(worst.profit)} profit
            </div>
          </div>
        )}
      </div>

      {rows.length > withCost.length && (
        <p className="mt-3 text-xs text-slate-500 flex items-center gap-1">
          <Hammer className="h-3 w-3" />
          Add an actual or estimated cost to your other completed jobs to track margin everywhere.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" | "neutral" }) {
  const cls =
    tone === "good"  ? "text-emerald-700" :
    tone === "bad"   ? "text-rose-700"    :
    tone === "neutral" ? "text-amber-700" : "text-slate-900";
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`mt-0.5 text-lg font-bold ${cls}`}>{value}</div>
    </div>
  );
}
