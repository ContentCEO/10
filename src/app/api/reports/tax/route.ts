import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Quarterly tax report. Returns income (paid invoices) and expenses
// (job_expenses) for a quarter, plus a CSV download.
//
// GET /api/reports/tax?quarter=2026-Q1&format=csv
// Default quarter = current calendar quarter.

interface Invoice {
  number: string | null;
  amount_cents: number;
  tax_cents: number;
  paid_at: string | null;
}
interface Expense {
  kind: string;
  vendor: string | null;
  description: string | null;
  amount_cents: number;
  tax_cents: number;
  spent_at: string;
}

function quarterRange(q: string): { start: string; end: string; label: string } {
  // q is "YYYY-Q1" .. "YYYY-Q4"
  const m = q.match(/^(\d{4})-Q([1-4])$/);
  const now = new Date();
  const year = m ? parseInt(m[1], 10) : now.getFullYear();
  const qn   = m ? parseInt(m[2], 10) : Math.floor(now.getMonth() / 3) + 1;
  const startMonth = (qn - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end   = new Date(year, startMonth + 3, 1);
  return {
    start: start.toISOString().slice(0, 10),
    end:   end.toISOString().slice(0, 10),
    label: `${year}-Q${qn}`,
  };
}

function csvEscape(s: string | number | null | undefined): string {
  const v = s == null ? "" : String(s);
  if (v.includes(",") || v.includes('"') || v.includes("\n")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const q = url.searchParams.get("quarter") ?? "";
  const format = url.searchParams.get("format") ?? "json";
  const { start, end, label } = quarterRange(q);

  const [{ data: invs }, { data: exps }] = await Promise.all([
    supabase.from("invoices")
      .select("number,amount_cents,tax_cents,paid_at")
      .eq("user_id", user.id)
      .eq("status", "paid")
      .gte("paid_at", start)
      .lt("paid_at", end)
      .order("paid_at"),
    supabase.from("job_expenses")
      .select("kind,vendor,description,amount_cents,tax_cents,spent_at")
      .eq("user_id", user.id)
      .gte("spent_at", start)
      .lt("spent_at", end)
      .order("spent_at"),
  ]);

  const invoices = (invs ?? []) as Invoice[];
  const expenses = (exps ?? []) as Expense[];

  const incomeCents     = invoices.reduce((s, i) => s + i.amount_cents, 0);
  const incomeTaxCents  = invoices.reduce((s, i) => s + i.tax_cents, 0);
  const expenseCents    = expenses.reduce((s, e) => s + e.amount_cents, 0);
  const expenseTaxCents = expenses.reduce((s, e) => s + e.tax_cents, 0);
  const netCents        = incomeCents - expenseCents;

  const byKind: Record<string, number> = {};
  for (const e of expenses) {
    byKind[e.kind] = (byKind[e.kind] || 0) + e.amount_cents;
  }

  if (format === "csv") {
    const lines: string[] = [];
    lines.push(`Quarter,${label}`);
    lines.push(`Date range,${start} to ${end}`);
    lines.push("");
    lines.push("Section,Date,Type,Vendor/Number,Description,Amount,Tax");

    for (const i of invoices) {
      lines.push([
        "Income",
        csvEscape(i.paid_at?.slice(0, 10) ?? ""),
        "Invoice paid",
        csvEscape(i.number),
        "",
        (i.amount_cents / 100).toFixed(2),
        (i.tax_cents / 100).toFixed(2),
      ].join(","));
    }
    for (const e of expenses) {
      lines.push([
        "Expense",
        csvEscape(e.spent_at),
        csvEscape(e.kind),
        csvEscape(e.vendor),
        csvEscape(e.description),
        (e.amount_cents / 100).toFixed(2),
        (e.tax_cents / 100).toFixed(2),
      ].join(","));
    }

    lines.push("");
    lines.push("Summary");
    lines.push(`Total income (gross),${(incomeCents / 100).toFixed(2)}`);
    lines.push(`Sales tax collected,${(incomeTaxCents / 100).toFixed(2)}`);
    lines.push(`Total expenses,${(expenseCents / 100).toFixed(2)}`);
    lines.push(`Sales tax paid,${(expenseTaxCents / 100).toFixed(2)}`);
    lines.push(`Net (income − expenses),${(netCents / 100).toFixed(2)}`);
    lines.push("");
    lines.push("By expense category");
    for (const [k, v] of Object.entries(byKind)) {
      lines.push(`${k},${(v / 100).toFixed(2)}`);
    }

    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tax-report-${label}.csv"`,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    quarter: label,
    range: { start, end },
    income_cents: incomeCents,
    income_tax_cents: incomeTaxCents,
    expense_cents: expenseCents,
    expense_tax_cents: expenseTaxCents,
    net_cents: netCents,
    by_kind: byKind,
    invoice_count: invoices.length,
    expense_count: expenses.length,
  });
}
