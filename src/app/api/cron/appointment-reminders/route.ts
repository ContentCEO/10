import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

// Appointment confirmation reminder. Once an hour, finds scheduled jobs
// whose start_date is between 23-25 hours from now and the customer has
// a phone. Sends one confirmation SMS. Logs in job.description so we
// don't spam.
//
// Cuts no-shows by reminding the homeowner the day before.

interface JobRow {
  id: string;
  user_id: string;
  customer_id: string | null;
  title: string;
  description: string | null;
  start_date: string;
}
interface CustomerRow {
  id: string;
  phone: string | null;
  name: string | null;
}

const TAG = "[reminder24h]";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const windowStart = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();
  const windowEnd   = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

  const { data: jobs } = await admin
    .from("jobs")
    .select("id,user_id,customer_id,title,description,start_date")
    .eq("status", "scheduled")
    .not("customer_id", "is", null)
    .gte("start_date", windowStart)
    .lt("start_date", windowEnd)
    .limit(200);

  const upcoming = (jobs ?? []) as JobRow[];
  let sent = 0;
  let skipped = 0;
  let skippedAlready = 0;

  for (const j of upcoming) {
    if ((j.description ?? "").includes(TAG)) { skippedAlready++; continue; }

    const { data: cust } = await admin
      .from("customers").select("id,phone,name").eq("id", j.customer_id!).single();
    const c = cust as CustomerRow | null;
    if (!c?.phone) { skipped++; continue; }

    const when = new Date(j.start_date).toLocaleString("en-US", {
      weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });
    const firstName = c.name?.split(" ")[0] ?? "there";
    const message = `Hi ${firstName} — confirming our ${j.title} appointment tomorrow, ${when}. Reply YES to confirm, or RESCHEDULE if the time no longer works. Thanks!`;

    const result = await sendSms(c.phone, message);
    if (!result.ok) { skipped++; continue; }

    const newDesc = `${j.description ?? ""}\n${TAG} ${new Date().toISOString()}`.trim();
    await admin.from("jobs").update({ description: newDesc }).eq("id", j.id);
    sent++;
  }

  return NextResponse.json({
    ok: true,
    considered: upcoming.length,
    sent,
    skipped,
    skipped_already: skippedAlready,
  });
}

export async function POST(request: Request) { return GET(request); }
