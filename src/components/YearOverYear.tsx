import { ArrowDown, ArrowRight, ArrowUp, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

function monthRange(monthsAgo: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  const end = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 1);
  return { startISO: start.toISOString(), endISO: end.toISOString() };
}

function pctChange(current: number, prior: number) {
  if (prior === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prior) / prior) * 100);
}

export async function YearOverYear() {
  const supabase = createClient();
  const thisMonth = monthRange(0);
  const lastYear  = monthRange(12);

  const [
    { data: leadsNow },
    { data: leadsPrior },
    { data: jobsNow },
    { data: jobsPrior },
  ] = await Promise.all([
    supabase.from("leads").select("id,status").gte("created_at", thisMonth.startISO).lt("created_at", thisMonth.endISO),
    supabase.from("leads").select("id,status").gte("created_at", lastYear.startISO).lt("created_at", lastYear.endISO),
    supabase.from("jobs").select("price").eq("status", "completed").gte("updated_at", thisMonth.startISO).lt("updated_at", thisMonth.endISO),
    supabase.from("jobs").select("price").eq("status", "completed").gte("updated_at", lastYear.startISO).lt("updated_at", lastYear.endISO),
  ]);

  const sumPrice = (rows?: { price: number | null }[] | null) =>
    (rows ?? []).reduce((s, j) => s + (j.price ?? 0), 0);

  const totalLeadsNow   = (leadsNow ?? []).length;
  const totalLeadsPrior = (leadsPrior ?? []).length;
  const wonNow   = (leadsNow ?? []).filter((l) => l.status === "won").length;
  const wonPrior = (leadsPrior ?? []).filter((l) => l.status === "won").length;
  const revNow   = sumPrice(jobsNow);
  const revPrior = sumPrice(jobsPrior);
  const closeRateNow   = totalLeadsNow > 0 ? Math.round((wonNow / totalLeadsNow) * 100) : 0;
  const closeRatePrior = totalLeadsPrior > 0 ? Math.round((wonPrior / totalLeadsPrior) * 100) : 0;

  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-brand-600" /> Year-over-year
        </h2>
        <span className="text-xs text-slate-500">{monthName} this year vs last year</span>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Cmp label="Revenue"    current={formatCurrency(revNow)} delta={pctChange(revNow, revPrior)} />
        <Cmp label="New leads"  current={String(totalLeadsNow)}   delta={pctChange(totalLeadsNow, totalLeadsPrior)} />
        <Cmp label="Won deals"  current={String(wonNow)}          delta={pctChange(wonNow, wonPrior)} />
        <Cmp label="Close rate" current={`${closeRateNow}%`}      delta={closeRateNow - closeRatePrior} suffix="pp" />
      </div>
    </div>
  );
}

function Cmp({
  label, current, delta, suffix = "%",
}: {
  label: string;
  current: string;
  delta: number;
  suffix?: string;
}) {
  const up = delta > 0;
  const flat = delta === 0;
  const tone = flat ? "text-slate-500" : up ? "text-emerald-700" : "text-rose-700";
  const Icon = flat ? ArrowRight : up ? ArrowUp : ArrowDown;
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-bold">{current}</div>
      <div className={`text-xs flex items-center gap-0.5 ${tone}`}>
        <Icon className="h-3 w-3" />
        {Math.abs(delta)}{suffix}
        <span className="text-slate-400 ml-1">vs last year</span>
      </div>
    </div>
  );
}
