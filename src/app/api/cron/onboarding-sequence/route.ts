import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/messaging";

export const runtime = "nodejs";

// Welcome-series for newly-created customers. Sends 3 emails:
//   Day 0  → "Welcome — here's our portal link + how to reach us"
//   Day 7  → "How's everything going? Any questions?"
//   Day 30 → "Hey, share us with a neighbor? Here's $25 referral credit"
//
// Tags in customer.notes prevent double-sending.

interface CustRow {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  portal_token: string | null;
  notes: string | null;
  created_at: string;
}
interface BizRow {
  business_name: string | null;
  phone_public: string | null;
}

interface Stage {
  tag: string;
  minDays: number;
  maxDays: number;
  subject: (firstName: string, biz: string) => string;
  body: (ctx: { firstName: string; biz: string; phone: string | null; portalUrl: string | null }) => string;
}

const STAGES: Stage[] = [
  {
    tag: "[onboard-d0]",
    minDays: 0, maxDays: 2,
    subject: (firstName, biz) => `Welcome, ${firstName} — from ${biz}`,
    body: ({ firstName, biz, phone, portalUrl }) =>
`Hey ${firstName},

Thanks for choosing ${biz}. A few quick notes so you know what to expect:

• You'll get updates on every job ${portalUrl ? `at your portal: ${portalUrl}` : "via text and email"}.
• Need anything fast? ${phone ? `Just call ${phone}.` : "Reply to this email."}
• We're not a 24/7 emergency outfit — but we will respond within 1 business day, always.

Looking forward to working together.

— ${biz}`,
  },
  {
    tag: "[onboard-d7]",
    minDays: 6, maxDays: 8,
    subject: (firstName) => `Hi ${firstName}, checking in`,
    body: ({ firstName, biz, phone }) =>
`Hey ${firstName},

Quick check-in — how's everything going on your end?

If anything came up, replying here works, or call ${phone ?? "us"}. Even if it's a small thing, we'd rather know now than later.

— ${biz}`,
  },
  {
    tag: "[onboard-d30]",
    minDays: 29, maxDays: 32,
    subject: (firstName) => `${firstName}, got a neighbor who needs work done?`,
    body: ({ firstName, biz }) =>
`Hey ${firstName},

Quick ask: if you've got a neighbor or friend who needs a contractor, we'd love an intro. We'll knock $25 off your next service for every successful referral.

No pressure either way — just say the word and we'll send them a link.

— ${biz}`,
  },
];

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const now = Date.now();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://contractorflow.app";

  // Pull customers created in the last 35 days with email.
  const cutoff = new Date(now - 35 * 86_400_000).toISOString();
  const { data: rows } = await admin
    .from("customers")
    .select("id,user_id,name,email,portal_token,notes,created_at")
    .gt("created_at", cutoff)
    .not("email", "is", null)
    .limit(500);
  const customers = (rows ?? []) as CustRow[];

  const bizCache = new Map<string, BizRow | null>();
  let sent = 0;
  let skipped = 0;

  for (const c of customers) {
    if (!c.email) { skipped++; continue; }
    const ageDays = (now - new Date(c.created_at).getTime()) / 86_400_000;

    const stage = STAGES.find((s) =>
      ageDays >= s.minDays && ageDays <= s.maxDays && !(c.notes ?? "").includes(s.tag));
    if (!stage) { skipped++; continue; }

    if (!bizCache.has(c.user_id)) {
      const { data: b } = await admin
        .from("profiles").select("business_name,phone_public")
        .eq("id", c.user_id).maybeSingle();
      bizCache.set(c.user_id, b as BizRow | null);
    }
    const biz = bizCache.get(c.user_id);
    const bizName = biz?.business_name ?? "Your contractor";
    const firstName = c.name?.split(" ")[0] ?? "there";
    const portalUrl = c.portal_token ? `${origin}/portal/${c.portal_token}` : null;

    const subject = stage.subject(firstName, bizName);
    const body = stage.body({
      firstName, biz: bizName,
      phone: biz?.phone_public ?? null,
      portalUrl,
    });

    const result = await sendEmail(c.email, subject, body);
    if (result.ok) {
      const newNotes = `${c.notes ?? ""}\n${stage.tag} ${new Date().toISOString().slice(0, 10)}`.trim();
      await admin.from("customers").update({ notes: newNotes }).eq("id", c.id);
      sent++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, considered: customers.length, sent, skipped });
}

export async function POST(request: Request) { return GET(request); }
