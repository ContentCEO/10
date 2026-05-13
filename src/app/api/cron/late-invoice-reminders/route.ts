import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

// Late invoice reminder. Once a day, finds invoices that are past due
// and not yet paid, then sends one SMS reminder per escalation tier:
//
//   3 days past due  →  friendly nudge
//   10 days past due →  firmer reminder
//   21 days past due →  collections-prep warning
//
// We log each tier sent in invoice.notes so we don't spam the customer.
// Skips if the contractor's Twilio isn't configured (sendSms is a no-op).

interface InvoiceRow {
  id: string;
  user_id: string;
  customer_id: string | null;
  number: string | null;
  amount_cents: number;
  due_at: string | null;
  notes: string | null;
}
interface CustomerRow {
  id: string;
  phone: string | null;
  name: string | null;
}

interface Tier { tag: string; days: number; tmpl: (ctx: { name: string; amt: string; num: string }) => string; }

const TIERS: Tier[] = [
  {
    tag: "tier1-3d",
    days: 3,
    tmpl: ({ name, amt, num }) =>
      `Hi ${name}, just a quick reminder — invoice ${num} for ${amt} was due last week. Let us know if you need a hand or run into trouble. Thanks!`,
  },
  {
    tag: "tier2-10d",
    days: 10,
    tmpl: ({ name, amt, num }) =>
      `Hi ${name}, this is a second reminder that invoice ${num} for ${amt} is now 10 days past due. Could you take care of it this week? Reply if you need a different payment option.`,
  },
  {
    tag: "tier3-21d",
    days: 21,
    tmpl: ({ name, amt, num }) =>
      `${name} — invoice ${num} (${amt}) is now 3 weeks past due. We&apos;ll need to escalate to collections within 7 days. Please call us or reply today so we can avoid that.`,
  },
];

function fmtUsd(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const now = Date.now();

  // Cap at 200 invoices/run.
  const { data: invs } = await admin
    .from("invoices")
    .select("id,user_id,customer_id,number,amount_cents,due_at,notes")
    .in("status", ["sent", "draft"])
    .not("due_at", "is", null)
    .lt("due_at", new Date(now - 3 * 86_400_000).toISOString())
    .limit(200);

  const invoices = (invs ?? []) as InvoiceRow[];
  let sent = 0;
  let skipped = 0;
  let skippedNoPhone = 0;

  for (const inv of invoices) {
    if (!inv.customer_id || !inv.due_at) { skipped++; continue; }
    const overdueDays = Math.floor((now - new Date(inv.due_at).getTime()) / 86_400_000);

    // Find the highest-tier reminder we haven't sent yet.
    const tier = [...TIERS].reverse().find((t) => overdueDays >= t.days && !(inv.notes ?? "").includes(t.tag));
    if (!tier) { skipped++; continue; }

    const { data: cust } = await admin
      .from("customers").select("id,phone,name").eq("id", inv.customer_id).single();
    const customer = cust as CustomerRow | null;
    if (!customer?.phone) { skippedNoPhone++; continue; }

    const message = tier.tmpl({
      name: customer.name?.split(" ")[0] ?? "there",
      amt: fmtUsd(inv.amount_cents),
      num: inv.number ?? inv.id.slice(0, 8),
    });

    const result = await sendSms(customer.phone, message);
    if (!result.ok) { skipped++; continue; }

    // Log the tier in notes so we don't double-send.
    const newNotes = `${inv.notes ?? ""}\n[${new Date().toISOString().slice(0, 10)}] reminder ${tier.tag} sent`.trim();
    await admin.from("invoices").update({ notes: newNotes }).eq("id", inv.id);
    sent++;
  }

  return NextResponse.json({
    ok: true,
    considered: invoices.length,
    sent,
    skipped,
    skipped_no_phone: skippedNoPhone,
  });
}

export async function POST(request: Request) { return GET(request); }
