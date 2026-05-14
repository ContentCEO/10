import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/messaging";

export const runtime = "nodejs";
export const maxDuration = 60;

// Dormant-customer re-engagement. Once a week, finds customers whose
// last job completed 6-9 months ago and who haven't gotten a
// re-engagement email yet. Sends a "we miss you" email with the
// contractor's name + a CTA to call.
//
// Logs tag in customer.notes so we never double-send.

const TAG = "[reengagement-sent]";

interface CustRow {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  notes: string | null;
}
interface JobRow { customer_id: string | null; updated_at: string; }
interface BizRow { business_name: string | null; phone_public: string | null; }

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const sixMo  = new Date(Date.now() - 6 * 30 * 86_400_000).toISOString();
  const nineMo = new Date(Date.now() - 9 * 30 * 86_400_000).toISOString();

  // Find completed jobs whose last update falls in the 6-9mo window.
  const { data: candidateJobs } = await admin
    .from("jobs")
    .select("customer_id,updated_at")
    .eq("status", "completed")
    .gt("updated_at", nineMo)
    .lt("updated_at", sixMo)
    .not("customer_id", "is", null)
    .limit(1000);

  const jobs = (candidateJobs ?? []) as JobRow[];
  const candidateCustomerIds = Array.from(new Set(jobs.map((j) => j.customer_id!)));
  if (candidateCustomerIds.length === 0) {
    return NextResponse.json({ ok: true, considered: 0, sent: 0 });
  }

  // Skip any customer who's had a more-recent job (we only want truly dormant).
  const { data: recentJobs } = await admin
    .from("jobs")
    .select("customer_id")
    .gt("updated_at", sixMo)
    .in("customer_id", candidateCustomerIds);
  const recentSet = new Set(((recentJobs ?? []) as JobRow[])
    .map((j) => j.customer_id!).filter(Boolean));
  const truly_dormant = candidateCustomerIds.filter((id) => !recentSet.has(id));

  const { data: custs } = await admin
    .from("customers")
    .select("id,user_id,name,email,notes")
    .in("id", truly_dormant.slice(0, 500));
  const customers = (custs ?? []) as CustRow[];

  let sent = 0;
  let skipped = 0;
  const bizCache = new Map<string, BizRow | null>();

  for (const c of customers) {
    if (!c.email) { skipped++; continue; }
    if ((c.notes ?? "").includes(TAG)) { skipped++; continue; }

    if (!bizCache.has(c.user_id)) {
      const { data: b } = await admin
        .from("profiles").select("business_name,phone_public").eq("id", c.user_id).maybeSingle();
      bizCache.set(c.user_id, b as BizRow | null);
    }
    const biz = bizCache.get(c.user_id);
    const bizName = biz?.business_name ?? "Your contractor";
    const phone = biz?.phone_public ? `\n\nCall us at ${biz.phone_public}.` : "";

    const firstName = c.name?.split(" ")[0] ?? "there";
    const subject = `Hi ${firstName}, it's been a while`;
    const body =
`Hey ${firstName},

It's been about 6 months since we last worked together. Just checking in — is there anything around the house you've been meaning to tackle?

We're booking out spring jobs now. Reply to this email or text us back and we'll get you on the calendar before the rush.${phone}

— ${bizName}`;

    const result = await sendEmail(c.email, subject, body);
    if (result.ok) {
      const newNotes = `${c.notes ?? ""}\n${TAG} ${new Date().toISOString().slice(0, 10)}`.trim();
      await admin.from("customers").update({ notes: newNotes }).eq("id", c.id);
      sent++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    considered: customers.length,
    sent,
    skipped,
  });
}

export async function POST(request: Request) { return GET(request); }
