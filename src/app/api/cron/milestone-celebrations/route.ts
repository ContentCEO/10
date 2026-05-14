import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/messaging";

export const runtime = "nodejs";

// Milestone celebration emails. Once a day, find customers who crossed
// a milestone (5th completed job, 10th, 25th, $10k spent, $25k spent,
// $50k spent) and send a personalized thank-you.
//
// Tag in customer.notes prevents repeated sends.

interface Cust {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  notes: string | null;
}
interface JobLite { customer_id: string | null; price: number | null; }
interface BizRow { business_name: string | null; phone_public: string | null; }

interface Milestone {
  tag: string;
  hit: (jobs: number, spend: number) => boolean;
  subject: (firstName: string) => string;
  body: (ctx: { firstName: string; biz: string; phone: string | null; jobs: number; spend: number }) => string;
}

const MILESTONES: Milestone[] = [
  {
    tag: "[milestone-5jobs]",
    hit: (jobs) => jobs === 5,
    subject: (n) => `${n}, that's 5 jobs together`,
    body: ({ firstName, biz }) =>
`Hey ${firstName},

Just realized that's 5 completed jobs together. Wild. Thanks for trusting us with all of them.

You're officially in our "called first" tier — anytime we have a cancellation or early opening, you get the call before it goes public.

— ${biz}`,
  },
  {
    tag: "[milestone-10jobs]",
    hit: (jobs) => jobs === 10,
    subject: (n) => `${n} — 10 jobs!`,
    body: ({ firstName, biz, phone }) =>
`Hey ${firstName},

Hit a milestone today: 10 completed jobs together. That means more to a small contractor business than you probably realize.

Save my cell ${phone ?? ""} — text me direct from here on out. No queue, no forms.

Thank you, truly.

— ${biz}`,
  },
  {
    tag: "[milestone-25jobs]",
    hit: (jobs) => jobs === 25,
    subject: () => `25 jobs — you're family at this point`,
    body: ({ firstName, biz }) =>
`Hey ${firstName},

25 jobs. That's family-business territory. Send me your address so I can put you on the holiday card list.

— ${biz}`,
  },
  {
    tag: "[milestone-10k]",
    hit: (_, spend) => spend >= 10_000 && spend < 11_000,
    subject: (n) => `${n}, $10k together`,
    body: ({ firstName, biz }) =>
`Hi ${firstName},

Quietly noticed we just crossed $10,000 in work together. Every dollar matters to us — thank you for choosing local.

— ${biz}`,
  },
  {
    tag: "[milestone-25k]",
    hit: (_, spend) => spend >= 25_000 && spend < 27_500,
    subject: (n) => `${n}, $25k together`,
    body: ({ firstName, biz, phone }) =>
`Hey ${firstName},

Crossed $25k in work together. Putting you on our VIP list — anything urgent gets bumped to the top.

If something breaks, call my cell first: ${phone ?? "(in your portal)"}.

— ${biz}`,
  },
  {
    tag: "[milestone-50k]",
    hit: (_, spend) => spend >= 50_000 && spend < 55_000,
    subject: () => `Crossed $50k together`,
    body: ({ firstName, biz }) =>
`Hey ${firstName},

$50,000 of work together. We don't take that lightly.

Thank you. We'll see you next time.

— ${biz}`,
  },
];

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  // Pull customers + their job stats.
  const { data: customers } = await admin
    .from("customers")
    .select("id,user_id,name,email,notes")
    .not("email", "is", null)
    .limit(5000);
  const custs = (customers ?? []) as Cust[];
  if (custs.length === 0) return NextResponse.json({ ok: true, considered: 0, sent: 0 });

  const ids = custs.map((c) => c.id);
  const { data: jobs } = await admin
    .from("jobs").select("customer_id,price")
    .eq("status", "completed").in("customer_id", ids);
  const jobList = (jobs ?? []) as JobLite[];

  const statsByCust = new Map<string, { jobs: number; spend: number }>();
  for (const j of jobList) {
    if (!j.customer_id) continue;
    const cur = statsByCust.get(j.customer_id) ?? { jobs: 0, spend: 0 };
    cur.jobs++;
    cur.spend += j.price ?? 0;
    statsByCust.set(j.customer_id, cur);
  }

  const bizCache = new Map<string, BizRow | null>();
  let sent = 0;
  let skipped = 0;

  for (const c of custs) {
    if (!c.email) { skipped++; continue; }
    const stats = statsByCust.get(c.id) ?? { jobs: 0, spend: 0 };

    const milestone = MILESTONES.find((m) =>
      m.hit(stats.jobs, stats.spend) && !(c.notes ?? "").includes(m.tag));
    if (!milestone) { skipped++; continue; }

    if (!bizCache.has(c.user_id)) {
      const { data: b } = await admin
        .from("profiles").select("business_name,phone_public").eq("id", c.user_id).maybeSingle();
      bizCache.set(c.user_id, b as BizRow | null);
    }
    const biz = bizCache.get(c.user_id);
    const firstName = c.name?.split(" ")[0] ?? "there";

    const subject = milestone.subject(firstName);
    const body = milestone.body({
      firstName,
      biz: biz?.business_name ?? "Your contractor",
      phone: biz?.phone_public ?? null,
      jobs: stats.jobs,
      spend: stats.spend,
    });

    const result = await sendEmail(c.email, subject, body);
    if (result.ok) {
      const newNotes = `${c.notes ?? ""}\n${milestone.tag} ${new Date().toISOString().slice(0, 10)}`.trim();
      await admin.from("customers").update({ notes: newNotes }).eq("id", c.id);
      sent++;
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, considered: custs.length, sent, skipped });
}

export async function POST(request: Request) { return GET(request); }
