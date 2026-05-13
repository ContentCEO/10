import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

// NPS auto-send. Once a day, finds jobs completed 6-8 days ago that
// haven't already been sent an NPS link, and SMS's the homeowner with
// the /nps/[jobId] survey URL.
//
// Tag stored in job.description so we never double-send.

interface JobRow {
  id: string;
  user_id: string;
  customer_id: string | null;
  title: string;
  description: string | null;
  updated_at: string;
}
interface CustomerRow {
  id: string;
  phone: string | null;
  name: string | null;
}
interface BizRow {
  business_name: string | null;
}

const TAG = "[nps-sent]";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const sevenDaysAgo  = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const eightDaysAgo  = new Date(Date.now() - 8 * 86_400_000).toISOString();
  const sixDaysAgo    = new Date(Date.now() - 6 * 86_400_000).toISOString();
  void sevenDaysAgo;

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://contractorflow.app";

  const { data: jobs } = await admin
    .from("jobs")
    .select("id,user_id,customer_id,title,description,updated_at")
    .eq("status", "completed")
    .lt("updated_at", sixDaysAgo)
    .gt("updated_at", eightDaysAgo)
    .not("customer_id", "is", null)
    .limit(200);

  const rows = (jobs ?? []) as JobRow[];
  let sent = 0;
  let skippedAlready = 0;
  let skippedNoPhone = 0;
  let skippedSendFail = 0;

  // Cache profile lookups.
  const bizCache = new Map<string, string | null>();

  for (const j of rows) {
    if ((j.description ?? "").includes(TAG)) { skippedAlready++; continue; }

    const { data: cust } = await admin
      .from("customers").select("id,phone,name").eq("id", j.customer_id!).single();
    const c = cust as CustomerRow | null;
    if (!c?.phone) { skippedNoPhone++; continue; }

    if (!bizCache.has(j.user_id)) {
      const { data: prof } = await admin
        .from("profiles").select("business_name").eq("id", j.user_id).maybeSingle();
      bizCache.set(j.user_id, (prof as BizRow | null)?.business_name ?? null);
    }
    const biz = bizCache.get(j.user_id) ?? "ContractorFlow";

    const firstName = c.name?.split(" ")[0] ?? "there";
    const link = `${origin}/nps/${j.id}`;
    const message = `Hey ${firstName}, ${biz} here — hope the ${j.title} went well! Mind taking 10 seconds to rate it? ${link} Thanks so much!`;

    const result = await sendSms(c.phone, message);
    if (!result.ok) { skippedSendFail++; continue; }

    const newDesc = `${j.description ?? ""}\n${TAG} ${new Date().toISOString()}`.trim();
    await admin.from("jobs").update({ description: newDesc }).eq("id", j.id);
    sent++;
  }

  return NextResponse.json({
    ok: true,
    considered: rows.length,
    sent,
    skipped_already: skippedAlready,
    skipped_no_phone: skippedNoPhone,
    skipped_send_fail: skippedSendFail,
  });
}

export async function POST(request: Request) { return GET(request); }
