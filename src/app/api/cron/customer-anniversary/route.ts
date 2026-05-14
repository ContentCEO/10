import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/messaging";

export const runtime = "nodejs";

// Customer 1-year + 2-year anniversary celebration. Once a day, find
// customers whose created_at falls in today's date one or two years
// ago, send a short thank-you with a returning-customer offer.
//
// Tag in notes so we don't double-send.

interface CustRow {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}
interface BizRow { business_name: string | null; phone_public: string | null; }

function sameDayOfYear(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const now = new Date();

  const oneYearAgo  = new Date(now); oneYearAgo.setFullYear(now.getFullYear() - 1);
  const twoYearsAgo = new Date(now); twoYearsAgo.setFullYear(now.getFullYear() - 2);
  const threeYearsAgo = new Date(now); threeYearsAgo.setFullYear(now.getFullYear() - 3);

  const { data: rows } = await admin
    .from("customers")
    .select("id,user_id,name,email,notes,created_at")
    .gte("created_at", threeYearsAgo.toISOString())
    .not("email", "is", null)
    .limit(5000);
  const customers = (rows ?? []) as CustRow[];

  let sent = 0;
  let skipped = 0;
  const bizCache = new Map<string, BizRow | null>();

  for (const c of customers) {
    if (!c.email) { skipped++; continue; }
    const created = new Date(c.created_at);
    let years: number | null = null;
    if (sameDayOfYear(created, oneYearAgo))   years = 1;
    else if (sameDayOfYear(created, twoYearsAgo)) years = 2;
    if (!years) { skipped++; continue; }

    const tag = `[anniv-${years}y-sent]`;
    if ((c.notes ?? "").includes(tag)) { skipped++; continue; }

    if (!bizCache.has(c.user_id)) {
      const { data: b } = await admin
        .from("profiles").select("business_name,phone_public")
        .eq("id", c.user_id).maybeSingle();
      bizCache.set(c.user_id, b as BizRow | null);
    }
    const biz = bizCache.get(c.user_id);
    const bizName = biz?.business_name ?? "Your contractor";
    const phone = biz?.phone_public ? `\n\nCall us at ${biz.phone_public}.` : "";
    const firstName = c.name?.split(" ")[0] ?? "there";

    const subject = years === 1
      ? `Hi ${firstName}, hard to believe it's been a year`
      : `Hi ${firstName}, ${years} years already`;

    const offer = years === 1
      ? "10% off your next service this month — just mention this email."
      : "20% off your next service this month + free estimate — just mention this email.";

    const body =
`Hi ${firstName},

Hard to believe — it's been ${years} year${years === 1 ? "" : "s"} since we first worked together. Thanks for trusting us back then. Hope everything's still holding up well.

If anything around the house needs attention now, here's a thank-you: ${offer}${phone}

Means a lot. Talk soon.

— ${bizName}`;

    const result = await sendEmail(c.email, subject, body);
    if (result.ok) {
      const newNotes = `${c.notes ?? ""}\n${tag} ${new Date().toISOString().slice(0, 10)}`.trim();
      await admin.from("customers").update({ notes: newNotes }).eq("id", c.id);
      sent++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, considered: customers.length, sent, skipped });
}

export async function POST(request: Request) { return GET(request); }
