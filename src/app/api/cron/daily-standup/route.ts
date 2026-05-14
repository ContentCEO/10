import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

// Daily standup. 6 AM SMS to the contractor with today's
// concrete agenda — jobs, follow-ups, weather risk, urgent items.
// Different from owner-digest (which is yesterday's recap).

interface ProfileRow {
  id: string;
  business_name: string | null;
  alert_phone: string | null;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

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
      { count: jobsToday },
      { data: jobsList },
      { count: followupsCount },
      { count: hotLeadsCount },
      { count: overdueInvoices },
      { count: lapsedCompliance },
    ] = await Promise.all([
      admin.from("jobs").select("id", { count: "exact", head: true })
        .eq("user_id", p.id).eq("status", "scheduled")
        .gte("start_date", today).lt("start_date", tomorrow),
      admin.from("jobs").select("id,title,start_date,customer_id")
        .eq("user_id", p.id).eq("status", "scheduled")
        .gte("start_date", today).lt("start_date", tomorrow)
        .order("start_date").limit(3),
      admin.from("follow_ups").select("id", { count: "exact", head: true })
        .eq("user_id", p.id).is("completed_at", null)
        .gte("due_at", today).lt("due_at", tomorrow),
      admin.from("leads").select("id", { count: "exact", head: true })
        .eq("user_id", p.id).gte("ai_score", 80)
        .not("status", "in", "(won,lost)"),
      admin.from("invoices").select("id", { count: "exact", head: true })
        .eq("user_id", p.id).in("status", ["sent", "draft"])
        .lt("due_at", now.toISOString()),
      admin.from("compliance_items").select("id", { count: "exact", head: true })
        .eq("user_id", p.id).lt("expires_on", today.slice(0, 10)),
    ]);

    const parts: string[] = [];
    if (jobsToday ?? 0)        parts.push(`${jobsToday} job${jobsToday === 1 ? "" : "s"}`);
    if (followupsCount ?? 0)   parts.push(`${followupsCount} f/u`);
    if (hotLeadsCount ?? 0)    parts.push(`${hotLeadsCount} hot lead${hotLeadsCount === 1 ? "" : "s"}`);
    if (overdueInvoices ?? 0)  parts.push(`${overdueInvoices} overdue inv`);
    if (lapsedCompliance ?? 0) parts.push(`⚠️ ${lapsedCompliance} lapsed`);

    const jobs = (jobsList ?? []) as { title: string; start_date: string | null }[];
    const firstJob = jobs[0];
    const firstJobTxt = firstJob
      ? `\n${new Date(firstJob.start_date!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} ${firstJob.title}`
      : "";

    if (parts.length === 0) { skipped++; continue; }

    const message = `☀️ Today: ${parts.join(" · ")}.${firstJobTxt}`;
    const result = await sendSms(p.alert_phone, message);
    if (result.ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, considered: profiles.length, sent, skipped });
}

export async function POST(request: Request) { return GET(request); }
