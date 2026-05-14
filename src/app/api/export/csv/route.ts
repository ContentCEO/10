import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Bulk CSV export. GET /api/export/csv?table=leads|customers|jobs|invoices|expenses
// Returns a CSV download with everything the user owns in that table.
//
// Data portability — your data is always exportable.

function csvEscape(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const ALLOWED: Record<string, { table: string; cols: string[] }> = {
  leads:     { table: "leads",     cols: ["id","name","phone","email","source","service_type","status","price","ai_score","trade_tag","intent_tag","notes","created_at","updated_at"] },
  customers: { table: "customers", cols: ["id","name","phone","email","address","recurring_active","recurring_frequency","recurring_price","sms_opted_out","created_at"] },
  jobs:      { table: "jobs",      cols: ["id","title","description","status","start_date","end_date","price","cost_estimate_cents","cost_actual_cents","customer_id","lead_id","created_at","updated_at"] },
  invoices:  { table: "invoices",  cols: ["id","number","amount_cents","tax_cents","status","issued_at","due_at","paid_at","customer_id","job_id","notes","created_at"] },
  expenses:  { table: "job_expenses", cols: ["id","job_id","kind","vendor","description","amount_cents","tax_cents","spent_at","created_at"] },
};

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Not authenticated", { status: 401 });

  const url = new URL(request.url);
  const tableKey = url.searchParams.get("table") ?? "";
  const config = ALLOWED[tableKey];
  if (!config) {
    return new Response(
      `Invalid table. Valid: ${Object.keys(ALLOWED).join(", ")}`,
      { status: 400 },
    );
  }

  // Pull up to 10,000 rows. Anything bigger and the contractor should
  // be using direct Supabase access.
  const { data: rows, error } = await supabase
    .from(config.table)
    .select(config.cols.join(","))
    .eq("user_id", user.id)
    .limit(10_000);

  if (error) return new Response(`Query error: ${error.message}`, { status: 500 });

  const lines: string[] = [];
  lines.push(config.cols.map(csvEscape).join(","));
  for (const row of (rows ?? []) as Record<string, unknown>[]) {
    lines.push(config.cols.map((c) => csvEscape(row[c])).join(","));
  }

  const filename = `${tableKey}-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
