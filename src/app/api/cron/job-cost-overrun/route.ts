import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

// Job-cost overrun watchdog. Every 6 hours, sums job_expenses per
// active (scheduled / in_progress) job and compares against job.price.
// When expenses cross 75% of price → SMS the contractor with the
// job link. When they cross 100% → second-tier alert.
//
// Tag stored in job.description so we never spam.

interface JobRow {
  id: string;
  user_id: string;
  title: string;
  price: number | null;
  description: string | null;
}
interface ProfileRow {
  alert_phone: string | null;
}

const TAG75  = "[cost-75]";
const TAG100 = "[cost-100]";

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: jobs } = await admin
    .from("jobs")
    .select("id,user_id,title,price,description")
    .in("status", ["scheduled", "in_progress"])
    .not("price", "is", null)
    .gt("price", 0)
    .limit(500);

  const rows = (jobs ?? []) as JobRow[];
  let flagged75 = 0;
  let flagged100 = 0;

  const phoneCache = new Map<string, string | null>();

  for (const j of rows) {
    if (!j.price || j.price <= 0) continue;
    const desc = j.description ?? "";

    // Already alerted at 100% — skip everything.
    if (desc.includes(TAG100)) continue;

    const { data: expenses } = await admin
      .from("job_expenses").select("amount_cents,tax_cents").eq("job_id", j.id);
    const totalCents = ((expenses ?? []) as { amount_cents: number; tax_cents: number }[])
      .reduce((s, e) => s + e.amount_cents + e.tax_cents, 0);
    const priceCents = Math.round(j.price * 100);
    if (priceCents <= 0) continue;
    const pct = totalCents / priceCents;

    let tier: typeof TAG75 | typeof TAG100 | null = null;
    if (pct >= 1.0 && !desc.includes(TAG100)) tier = TAG100;
    else if (pct >= 0.75 && !desc.includes(TAG75)) tier = TAG75;
    if (!tier) continue;

    if (!phoneCache.has(j.user_id)) {
      const { data: prof } = await admin
        .from("profiles").select("alert_phone").eq("id", j.user_id).maybeSingle();
      phoneCache.set(j.user_id, (prof as ProfileRow | null)?.alert_phone ?? null);
    }
    const phone = phoneCache.get(j.user_id) ?? null;

    const message = tier === TAG100
      ? `🚨 ${j.title}: costs hit $${(totalCents / 100).toFixed(0)} (100%+ of $${j.price.toFixed(0)} price). Margin's gone.`
      : `⚠️ ${j.title}: costs at ${(pct * 100).toFixed(0)}% of price ($${(totalCents / 100).toFixed(0)} of $${j.price.toFixed(0)}). Tighten up.`;

    if (phone) {
      await sendSms(phone, message);
    }

    await admin.from("jobs")
      .update({ description: `${desc}\n${tier} ${new Date().toISOString()}`.trim() })
      .eq("id", j.id);

    if (tier === TAG100) flagged100++;
    else flagged75++;
  }

  return NextResponse.json({
    ok: true,
    scanned: rows.length,
    flagged_75: flagged75,
    flagged_100: flagged100,
  });
}

export async function POST(request: Request) { return GET(request); }
