import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

// Daily check of compliance_items. Sends one SMS at:
//   30 days before expiration (alerted_30d flag flips)
//   7 days before  (alerted_7d)
//   day-of-lapse   (alerted_lapsed)

interface ItemRow {
  id: string;
  user_id: string;
  kind: string;
  name: string;
  expires_on: string;
  alerted_30d: boolean;
  alerted_7d: boolean;
  alerted_lapsed: boolean;
}
interface ProfRow { alert_phone: string | null }

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const now = Date.now();

  const { data: rows } = await admin
    .from("compliance_items")
    .select("id,user_id,kind,name,expires_on,alerted_30d,alerted_7d,alerted_lapsed")
    .limit(1000);
  const items = (rows ?? []) as ItemRow[];

  let sent = 0;
  let skipped = 0;
  const phoneCache = new Map<string, string | null>();

  for (const i of items) {
    const days = Math.floor((new Date(i.expires_on).getTime() - now) / 86_400_000);
    let tier: "30d" | "7d" | "lapsed" | null = null;
    if (days < 0 && !i.alerted_lapsed) tier = "lapsed";
    else if (days <= 7 && days >= 0 && !i.alerted_7d) tier = "7d";
    else if (days <= 30 && days > 7 && !i.alerted_30d) tier = "30d";
    if (!tier) { skipped++; continue; }

    if (!phoneCache.has(i.user_id)) {
      const { data: p } = await admin
        .from("profiles").select("alert_phone").eq("id", i.user_id).maybeSingle();
      phoneCache.set(i.user_id, (p as ProfRow | null)?.alert_phone ?? null);
    }
    const phone = phoneCache.get(i.user_id) ?? null;

    const message = tier === "lapsed"
      ? `🚨 ${i.kind.toUpperCase()} LAPSED: "${i.name}" expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago. Renew now.`
      : tier === "7d"
        ? `⏰ ${i.name} (${i.kind}) expires in ${days} day${days === 1 ? "" : "s"}. Renew this week.`
        : `🔔 ${i.name} (${i.kind}) expires in ${days} days. Time to renew.`;

    if (phone) {
      await sendSms(phone, message);
    }
    await admin.from("compliance_items")
      .update(
        tier === "lapsed" ? { alerted_lapsed: true }
        : tier === "7d"   ? { alerted_7d: true }
                          : { alerted_30d: true }
      )
      .eq("id", i.id);
    sent++;
  }

  return NextResponse.json({ ok: true, scanned: items.length, sent, skipped });
}

export async function POST(request: Request) { return GET(request); }
