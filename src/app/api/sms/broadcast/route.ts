import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";
export const maxDuration = 60;

// Broadcast SMS to a slice of the contractor's customer book.
// POST /api/sms/broadcast
// Body: { message: string, audience?: "all" | "recurring" | "recent" }
//
// "recent" = customers with a job in the last 12 months.
// "recurring" = customers with recurring_active = true.
// "all" = everyone the contractor has (default).
//
// Caps:
//  - 250 recipients per call (re-invoke for larger lists)
//  - {{first_name}} placeholder gets substituted

interface CustomerRow { id: string; name: string | null; phone: string | null; }

interface Body { message?: string; audience?: "all" | "recurring" | "recent"; }

const MAX_RECIPIENTS = 250;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  const message = body?.message?.trim();
  if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });
  if (message.length > 320) return NextResponse.json({ error: "Message too long (320 char max)" }, { status: 400 });

  const audience = body?.audience ?? "all";

  let query = supabase.from("customers")
    .select("id,name,phone")
    .eq("user_id", user.id)
    .not("phone", "is", null);

  if (audience === "recurring") {
    query = query.eq("recurring_active", true);
  } else if (audience === "recent") {
    // Filter at SQL is harder for "has a job in last 12 mo" — easiest to pull
    // recent job customer_ids then filter the customers in-memory.
    const cutoff = new Date(Date.now() - 365 * 86_400_000).toISOString();
    const { data: jobs } = await supabase
      .from("jobs").select("customer_id")
      .eq("user_id", user.id)
      .gte("updated_at", cutoff)
      .not("customer_id", "is", null);
    const ids = Array.from(new Set(((jobs ?? []) as { customer_id: string | null }[])
      .map((j) => j.customer_id!).filter(Boolean)));
    if (ids.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, failed: 0, total: 0 });
    }
    query = query.in("id", ids);
  }

  const { data: rows } = await query.limit(MAX_RECIPIENTS);
  const customers = (rows ?? []) as CustomerRow[];

  let sentCount = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const c of customers) {
    if (!c.phone) { failed++; continue; }
    const firstName = c.name?.split(" ")[0] ?? "there";
    const personalized = message.replace(/\{\{first_name\}\}/gi, firstName);
    const result = await sendSms(c.phone, personalized);
    if (result.ok) sentCount++;
    else { failed++; failures.push(c.id); }
  }

  return NextResponse.json({
    ok: true,
    audience,
    total: customers.length,
    sent: sentCount,
    failed,
    capped: customers.length >= MAX_RECIPIENTS,
  });
}
