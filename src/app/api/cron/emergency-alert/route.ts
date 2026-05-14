import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

// Emergency-lead instant owner alert. Every 5 min, find leads created
// in the last 10 min tagged intent_tag='emergency' that we haven't
// alerted on yet (no [emergency-alerted] tag in notes).
//
// Texts the contractor's alert_phone with the lead name + service
// + phone so they can call immediately. These are the calls that
// pay the bills.

const TAG = "[emergency-alerted]";

interface LeadRow {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  service_type: string | null;
  notes: string | null;
  intent_tag: string | null;
}
interface ProfRow { alert_phone: string | null; }

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: rows } = await admin
    .from("leads")
    .select("id,user_id,name,phone,service_type,notes,intent_tag")
    .eq("intent_tag", "emergency")
    .gte("created_at", tenMinAgo)
    .limit(50);

  const leads = (rows ?? []) as LeadRow[];
  const phoneCache = new Map<string, string | null>();
  let alerted = 0;
  let skipped = 0;

  for (const l of leads) {
    if ((l.notes ?? "").includes(TAG)) { skipped++; continue; }

    if (!phoneCache.has(l.user_id)) {
      const { data: p } = await admin
        .from("profiles").select("alert_phone").eq("id", l.user_id).maybeSingle();
      phoneCache.set(l.user_id, (p as ProfRow | null)?.alert_phone ?? null);
    }
    const phone = phoneCache.get(l.user_id) ?? null;
    if (!phone) { skipped++; continue; }

    const svc = l.service_type ?? "unknown service";
    const cb = l.phone ? `\nCallback: ${l.phone}` : "";
    const message = `🚨 EMERGENCY LEAD\n${l.name} · ${svc}${cb}\nOpen the app to see details.`;

    const result = await sendSms(phone, message);
    if (!result.ok) { skipped++; continue; }

    await admin.from("leads")
      .update({ notes: `${l.notes ?? ""}\n${TAG} ${new Date().toISOString()}`.trim() })
      .eq("id", l.id);
    alerted++;
  }

  return NextResponse.json({ ok: true, considered: leads.length, alerted, skipped });
}

export async function POST(request: Request) { return GET(request); }
