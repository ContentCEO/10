import Link from "next/link";
import { Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Invoice } from "@/lib/types";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function daysOverdue(due: string | null) {
  if (!due) return 0;
  return Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000);
}

export async function ARAging() {
  const supabase = createClient();
  const { data } = await supabase
    .from("invoices")
    .select("id,number,amount_cents,tax_cents,due_at,status")
    .eq("status", "sent");
  const rows = (data ?? []) as Pick<Invoice, "id" | "number" | "amount_cents" | "tax_cents" | "due_at" | "status">[];

  if (rows.length === 0) return null;

  const buckets = { current: 0, b1: 0, b2: 0, b3: 0 };
  for (const i of rows) {
    const due = daysOverdue(i.due_at);
    const total = i.amount_cents + i.tax_cents;
    if (due <= 0)      buckets.current += total;
    else if (due <= 30) buckets.b1 += total;
    else if (due <= 60) buckets.b2 += total;
    else                buckets.b3 += total;
  }
  const outstanding =
    buckets.current + buckets.b1 + buckets.b2 + buckets.b3;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <Receipt className="h-4 w-4 text-amber-600" />
          AR aging
        </h2>
        <Link href="/invoices" className="text-sm text-brand-600">All invoices →</Link>
      </div>
      <div className="mt-3 text-3xl font-bold gradient-text">{money(outstanding)}</div>
      <div className="text-xs text-slate-500">outstanding across {rows.length} invoice{rows.length === 1 ? "" : "s"}</div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Bucket label="Current"   amount={money(buckets.current)} tone="slate" />
        <Bucket label="1–30 days" amount={money(buckets.b1)}      tone="amber" />
        <Bucket label="31–60 days" amount={money(buckets.b2)}     tone="orange" />
        <Bucket label="60+ days"   amount={money(buckets.b3)}     tone="rose" />
      </div>
    </div>
  );
}

function Bucket({
  label, amount, tone,
}: {
  label: string;
  amount: string;
  tone: "slate" | "amber" | "orange" | "rose";
}) {
  const cls = {
    slate:  "border-slate-200 bg-slate-50 text-slate-700",
    amber:  "border-amber-200 bg-amber-50 text-amber-800",
    orange: "border-orange-200 bg-orange-50 text-orange-800",
    rose:   "border-rose-200 bg-rose-50 text-rose-800",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
      <div className="mt-1 text-lg font-bold">{amount}</div>
    </div>
  );
}
