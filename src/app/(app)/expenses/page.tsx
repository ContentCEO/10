import Link from "next/link";
import { redirect } from "next/navigation";
import { Receipt, TrendingDown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "./ExpenseForm";

export const dynamic = "force-dynamic";

interface Expense {
  id: string;
  job_id: string | null;
  kind: string;
  vendor: string | null;
  description: string | null;
  amount_cents: number;
  tax_cents: number;
  receipt_url: string | null;
  spent_at: string;
}

const KIND_LABEL: Record<string, string> = {
  material: "Material",
  labor: "Labor",
  subcontractor: "Sub",
  equipment: "Equipment",
  permit: "Permit",
  fuel: "Fuel",
  other: "Other",
};

const KIND_TONE: Record<string, string> = {
  material:     "bg-brand-100 text-brand-700 ring-brand-200",
  labor:        "bg-violet-100 text-violet-700 ring-violet-200",
  subcontractor:"bg-amber-100 text-amber-700 ring-amber-200",
  equipment:    "bg-cyan-100 text-cyan-700 ring-cyan-200",
  permit:       "bg-emerald-100 text-emerald-700 ring-emerald-200",
  fuel:         "bg-rose-100 text-rose-700 ring-rose-200",
  other:        "bg-ink-100 text-ink-600 ring-ink-200",
};

export default async function ExpensesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: expenses }, { data: jobs }] = await Promise.all([
    supabase.from("job_expenses").select("*")
      .eq("user_id", user.id)
      .order("spent_at", { ascending: false })
      .limit(100),
    supabase.from("jobs").select("id,title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(50),
  ]);

  const rows = (expenses ?? []) as Expense[];
  const jobList = (jobs ?? []) as Array<{ id: string; title: string }>;

  const monthRows = rows.filter((r) => r.spent_at >= monthStart);
  const monthTotal = monthRows.reduce((s, r) => s + r.amount_cents + r.tax_cents, 0);
  const monthMaterial = monthRows.filter((r) => r.kind === "material")
    .reduce((s, r) => s + r.amount_cents, 0);
  const monthLabor = monthRows.filter((r) => r.kind === "labor" || r.kind === "subcontractor")
    .reduce((s, r) => s + r.amount_cents, 0);

  const jobMap = new Map(jobList.map((j) => [j.id, j.title]));

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Receipt className="h-3.5 w-3.5" /> Operations · Expenses</span>
          <h1 className="mt-2 display-h2">
            Track every <em>dollar out</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Log material, labor, and subcontractor spend per job. Powers your
            real profit per job and the quarterly tax export.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">This month</div>
          <div className="mt-1 text-3xl tabular-nums font-mono text-ink-900">${(monthTotal / 100).toFixed(0)}</div>
          <div className="mt-1 text-xs text-ink-500 flex items-center gap-1">
            <TrendingDown className="h-3 w-3" /> total spend
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Materials</div>
          <div className="mt-1 text-3xl tabular-nums font-mono text-ink-900">${(monthMaterial / 100).toFixed(0)}</div>
          <div className="mt-1 text-xs text-ink-500">Mostly job cost</div>
        </div>
        <div className="card p-4">
          <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Labor + Subs</div>
          <div className="mt-1 text-3xl tabular-nums font-mono text-ink-900">${(monthLabor / 100).toFixed(0)}</div>
          <div className="mt-1 text-xs text-ink-500">Crew + outside contractors</div>
        </div>
      </section>

      <ExpenseForm jobs={jobList} />

      <section className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Recent expenses</h2>
          <Link href="/api/reports/tax?format=csv" className="text-xs font-semibold text-brand-600 hover:underline inline-flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Export this quarter (CSV)
          </Link>
        </div>
        {rows.length === 0 ? (
          <div className="text-sm text-ink-500 text-center py-8 italic">
            No expenses logged yet. Add one above.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {rows.map((r) => (
              <li key={r.id} className="py-3 flex items-start gap-3">
                <span className={`badge ${KIND_TONE[r.kind] ?? KIND_TONE.other} shrink-0 mt-0.5`}>
                  {KIND_LABEL[r.kind] ?? r.kind}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-ink-900 truncate">
                    {r.vendor ?? r.description ?? "—"}
                  </div>
                  <div className="text-xs text-ink-500 truncate">
                    {r.spent_at}
                    {r.job_id && jobMap.get(r.job_id) ? ` · ${jobMap.get(r.job_id)}` : ""}
                    {r.description && r.vendor ? ` · ${r.description}` : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm tabular-nums font-mono font-semibold">
                    ${(r.amount_cents / 100).toFixed(2)}
                  </div>
                  {r.tax_cents > 0 && (
                    <div className="text-[10px] text-ink-500 tabular-nums">
                      +${(r.tax_cents / 100).toFixed(2)} tax
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
