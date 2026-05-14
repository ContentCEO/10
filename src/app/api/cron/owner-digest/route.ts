import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

// Owner daily digest. 7 AM SMS to every contractor with their phone set,
// summarizing yesterday's wins + today's load.
//
// One message per contractor — quick at-a-glance morning brief.

interface ProfileRow {
  id: string;
  business_name: string | null;
  alert_phone: string | null;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
  const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

  // Pull every contractor with an alert phone configured.
  const { data: profs } = await admin
    .from("profiles")
    .select("id,business_name,alert_phone")
    .not("alert_phone", "is", null)
    .eq("account_type", "contractor");
  const profiles = (profs ?? []) as ProfileRow[];

  let sent = 0;
  let skipped = 0;

  for (const p of profiles) {
    if (!p.alert_phone) { skipped++; continue; }

    const [
      { count: newLeadsYesterday },
      { data: wonYesterday },
      { count: todayJobsCount },
      { count: dueTodayCount },
    ] = await Promise.all([
      admin.from("leads").select("id", { count: "exact", head: true })
        .eq("user_id", p.id).gte("created_at", yesterdayStart).lt("created_at", todayStart),
      admin.from("jobs").select("price").eq("user_id", p.id).eq("status", "completed")
        .gte("updated_at", yesterdayStart).lt("updated_at", todayStart),
      admin.from("jobs").select("id", { count: "exact", head: true })
        .eq("user_id", p.id).eq("status", "scheduled")
        .gte("start_date", todayStart).lt("start_date", tomorrowStart),
      admin.from("follow_ups").select("id", { count: "exact", head: true })
        .eq("user_id", p.id).is("completed_at", null)
        .gte("due_at", todayStart).lt("due_at", tomorrowStart),
    ]);

    const earnedYesterday = ((wonYesterday ?? []) as { price: number | null }[])
      .reduce((s, j) => s + (j.price ?? 0), 0);

    const parts: string[] = [];
    if (newLeadsYesterday ?? 0)   parts.push(`${newLeadsYesterday} new lead${newLeadsYesterday === 1 ? "" : "s"}`);
    if (earnedYesterday > 0)      parts.push(`$${earnedYesterday.toLocaleString()} closed`);
    const yesterdayStr = parts.length ? parts.join(" · ") : "quiet day";

    const todayParts: string[] = [];
    if (todayJobsCount ?? 0)      todayParts.push(`${todayJobsCount} job${todayJobsCount === 1 ? "" : "s"}`);
    if (dueTodayCount ?? 0)       todayParts.push(`${dueTodayCount} follow-up${dueTodayCount === 1 ? "" : "s"} due`);
    const todayStr = todayParts.length ? todayParts.join(" · ") : "calendar is clear";

    const message = `☀️ Yesterday: ${yesterdayStr}. Today: ${todayStr}. — ContractorFlow`;

    const result = await sendSms(p.alert_phone, message);
    if (result.ok) sent++; else skipped++;
  }

  return NextResponse.json({ ok: true, considered: profiles.length, sent, skipped });
}

export async function POST(request: Request) { return GET(request); }
