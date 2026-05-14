import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

// New-lead instant SMS auto-reply. Every 5 min, find leads created
// in the last 10 min that have a phone, status='new', and haven't
// been responded to yet (no first_responded_at).
//
// Send a single "got your message, talking soon" text. Set
// first_responded_at so we don't double-send and so the velocity
// dashboard credits the contractor with fast response.
//
// Skips emergencies (intent=emergency) — those need a human ASAP,
// not an auto-reply.

interface LeadRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  service_type: string | null;
  intent_tag: string | null;
  status: string;
  first_responded_at: string | null;
}
interface BizRow {
  business_name: string | null;
  phone_public: string | null;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: rows } = await admin
    .from("leads")
    .select("id,user_id,name,phone,service_type,intent_tag,status,first_responded_at")
    .eq("status", "new")
    .is("first_responded_at", null)
    .not("phone", "is", null)
    .gte("created_at", tenMinAgo)
    .limit(50);

  const leads = (rows ?? []) as LeadRow[];
  const bizCache = new Map<string, BizRow | null>();

  let sent = 0;
  let skipped = 0;

  for (const l of leads) {
    if (!l.phone) { skipped++; continue; }
    if (l.intent_tag === "emergency") { skipped++; continue; }

    if (!bizCache.has(l.user_id)) {
      const { data: p } = await admin
        .from("profiles").select("business_name,phone_public")
        .eq("id", l.user_id).maybeSingle();
      bizCache.set(l.user_id, p as BizRow | null);
    }
    const biz = bizCache.get(l.user_id);
    const bizName = biz?.business_name ?? "your contractor";
    const callback = biz?.phone_public ? ` Or call ${biz.phone_public}.` : "";
    const firstName = l.name.split(" ")[0];
    const svc = l.service_type ?? "request";

    const message = `Hi ${firstName} — thanks for reaching out about ${svc}. This is ${bizName} confirming we got your message. Someone will be in touch within a business hour.${callback}`;

    const result = await sendSms(l.phone, message);
    if (!result.ok) { skipped++; continue; }

    await admin.from("leads")
      .update({ first_responded_at: new Date().toISOString() })
      .eq("id", l.id);
    sent++;
  }

  return NextResponse.json({ ok: true, considered: leads.length, sent, skipped });
}

export async function POST(request: Request) { return GET(request); }
