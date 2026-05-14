import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

// Stale-lead follow-up sequence. Hourly, finds leads in status='new'
// or 'contacted' that have a phone and haven't been touched in N days.
// Sends a single follow-up SMS per tier:
//
//   2 days  → soft check-in
//   5 days  → "still interested?"
//   10 days → final, then auto-archive triggers at 60d
//
// Tags in lead.notes prevent double-sends. Respects sms_opted_out on
// the linked customer (no opt-out yet for leads; future migration).

const TAG = (n: number) => `[stale-fu-${n}d]`;

interface LeadRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  service_type: string | null;
  status: string;
  notes: string | null;
  updated_at: string;
  customer_id: string | null;
}

interface Stage { days: number; msg: (name: string, biz: string, svc: string) => string; }

const STAGES: Stage[] = [
  {
    days: 2,
    msg: (name, biz, svc) =>
      `Hey ${name} — checking in about the ${svc}. Got a minute this week to chat through it? — ${biz}`,
  },
  {
    days: 5,
    msg: (name, biz, svc) =>
      `Hi ${name}, are you still considering ${svc}? Happy to answer questions or skip ahead to an estimate. — ${biz}`,
  },
  {
    days: 10,
    msg: (name, biz, svc) =>
      `${name} — last check on the ${svc}. If timing changed, reply with what fits and we'll work around it. — ${biz}`,
  },
];

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const now = Date.now();

  // Pull untouched-recently new/contacted leads with a phone.
  // 2d window minimum; we'll select for each tier in-loop.
  const twelveDaysAgo = new Date(now - 12 * 86_400_000).toISOString();
  const twoDaysAgo = new Date(now - 2 * 86_400_000).toISOString();

  const { data: rows } = await admin
    .from("leads")
    .select("id,user_id,name,phone,service_type,status,notes,updated_at,customer_id")
    .in("status", ["new", "contacted"])
    .not("phone", "is", null)
    .gt("updated_at", twelveDaysAgo)
    .lt("updated_at", twoDaysAgo)
    .limit(300);

  const leads = (rows ?? []) as LeadRow[];
  const bizCache = new Map<string, string>();

  let sent = 0;
  let skipped = 0;

  for (const l of leads) {
    if (!l.phone) { skipped++; continue; }

    const ageDays = (now - new Date(l.updated_at).getTime()) / 86_400_000;
    const stage = [...STAGES].reverse().find((s) =>
      ageDays >= s.days && !(l.notes ?? "").includes(TAG(s.days)));
    if (!stage) { skipped++; continue; }

    // Respect customer-level opt-out.
    if (l.customer_id) {
      const { data: c } = await admin
        .from("customers").select("sms_opted_out").eq("id", l.customer_id).maybeSingle();
      if ((c as { sms_opted_out?: boolean } | null)?.sms_opted_out) { skipped++; continue; }
    }

    if (!bizCache.has(l.user_id)) {
      const { data: p } = await admin
        .from("profiles").select("business_name").eq("id", l.user_id).maybeSingle();
      bizCache.set(l.user_id, (p as { business_name: string | null } | null)?.business_name ?? "");
    }
    const biz = bizCache.get(l.user_id) || "your contractor";
    const firstName = l.name.split(" ")[0];
    const svc = l.service_type ?? "your project";

    const result = await sendSms(l.phone, stage.msg(firstName, biz, svc));
    if (!result.ok) { skipped++; continue; }

    const newNotes = `${l.notes ?? ""}\n${TAG(stage.days)} ${new Date().toISOString().slice(0, 10)}`.trim();
    await admin.from("leads").update({ notes: newNotes }).eq("id", l.id);
    sent++;
  }

  return NextResponse.json({ ok: true, considered: leads.length, sent, skipped });
}

export async function POST(request: Request) { return GET(request); }
