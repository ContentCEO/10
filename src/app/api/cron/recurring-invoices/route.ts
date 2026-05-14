import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Daily cron that auto-issues invoices for customers with recurring
// schedules. For every job created by the recurring-services cron
// (G-1) that completes, an invoice gets created automatically by
// the auto-invoice hook (N-1).
//
// This separate cron handles the MAINTENANCE-CONTRACT case: a
// recurring customer is billed on a fixed cadence regardless of
// whether a job actually ran. Look for customers with
// recurring_price set, recurring_active=true, and a tag
// "[invoice-on-recurring]" in their notes to opt in.

interface Cust {
  id: string;
  user_id: string;
  name: string;
  recurring_price: number | null;
  recurring_frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | null;
  recurring_service: string | null;
  recurring_next_at: string | null;
  notes: string | null;
}

const OPT_IN_TAG = "[invoice-on-recurring]";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const now = new Date();
  const { data: rows } = await admin
    .from("customers")
    .select("id,user_id,name,recurring_price,recurring_frequency,recurring_service,recurring_next_at,notes")
    .eq("recurring_active", true)
    .not("recurring_price", "is", null)
    .not("recurring_next_at", "is", null)
    .lte("recurring_next_at", now.toISOString())
    .limit(200);

  const customers = (rows ?? []) as Cust[];
  let invoiced = 0;
  let skipped = 0;

  for (const c of customers) {
    // Only act on opt-in customers.
    if (!(c.notes ?? "").includes(OPT_IN_TAG)) { skipped++; continue; }
    if (!c.recurring_price) { skipped++; continue; }

    // Auto-increment invoice number.
    const { count } = await admin
      .from("invoices").select("id", { count: "exact", head: true })
      .eq("user_id", c.user_id);
    const number = `INV-R-${(((count ?? 0) + 1)).toString().padStart(4, "0")}`;

    const due = new Date(now); due.setDate(due.getDate() + 14);
    await admin.from("invoices").insert({
      user_id: c.user_id,
      customer_id: c.id,
      job_id: null,
      number,
      amount_cents: Math.round(c.recurring_price * 100),
      tax_cents: 0,
      notes: `Recurring ${c.recurring_frequency} · ${c.recurring_service ?? "service"} · auto-generated`,
      status: "draft",
      issued_at: now.toISOString(),
      due_at: due.toISOString(),
    });
    invoiced++;
  }

  return NextResponse.json({ ok: true, considered: customers.length, invoiced, skipped });
}

export async function POST(request: Request) { return GET(request); }
