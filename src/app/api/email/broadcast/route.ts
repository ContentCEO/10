import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/messaging";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/email/broadcast
// Body: { subject, body, audience? }
//
// Sends one email per recipient. {{first_name}} placeholder replaced
// per row. 200-recipient cap per call.

interface Body { subject?: string; body?: string; audience?: "all" | "recurring" | "recent"; }
interface CustomerRow { id: string; name: string | null; email: string | null; }

const MAX_RECIPIENTS = 200;

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  const subject = body?.subject?.trim();
  const message = body?.body?.trim();
  if (!subject || !message) {
    return NextResponse.json({ error: "subject + body required" }, { status: 400 });
  }
  if (subject.length > 200) {
    return NextResponse.json({ error: "Subject too long (200 char max)" }, { status: 400 });
  }
  if (message.length > 5000) {
    return NextResponse.json({ error: "Body too long (5000 char max)" }, { status: 400 });
  }
  const audience = body?.audience ?? "all";

  let query = supabase.from("customers")
    .select("id,name,email")
    .eq("user_id", user.id)
    .not("email", "is", null);

  if (audience === "recurring") {
    query = query.eq("recurring_active", true);
  } else if (audience === "recent") {
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

  let sent = 0;
  let failed = 0;

  for (const c of customers) {
    if (!c.email) { failed++; continue; }
    const firstName = c.name?.split(" ")[0] ?? "there";
    const personalizedSubject = subject.replace(/\{\{first_name\}\}/gi, firstName);
    const personalizedBody = message.replace(/\{\{first_name\}\}/gi, firstName);
    const result = await sendEmail(c.email, personalizedSubject, personalizedBody);
    if (result.ok) sent++;
    else failed++;
  }

  return NextResponse.json({
    ok: true,
    audience,
    total: customers.length,
    sent,
    failed,
    capped: customers.length >= MAX_RECIPIENTS,
  });
}
