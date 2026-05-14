import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendSms } from "@/lib/messaging";

export const runtime = "nodejs";

// Proposal nudge sequence. For proposals in status='sent' with no
// customer_signature yet, SMS the customer at:
//   3 days after sent  → soft check-in
//   7 days after sent  → "still open if you want it"
//   14 days after sent → final notice / expiration warning
//
// Tag stored in proposal.internal_notes so we don't double-send.

interface ProposalRow {
  id: string;
  user_id: string;
  customer_id: string | null;
  title: string;
  status: string;
  total_cents: number;
  share_token: string;
  sent_at: string | null;
  customer_signature: string | null;
  internal_notes: string | null;
}
interface CustomerRow { id: string; phone: string | null; name: string | null; }

interface Tier { tag: string; days: number; build: (ctx: { name: string; title: string; total: string; link: string }) => string; }

const TIERS: Tier[] = [
  {
    tag: "tier1-3d",
    days: 3,
    build: ({ name, title, link }) =>
      `Hey ${name}, any questions on the ${title} quote? Happy to walk through it. ${link}`,
  },
  {
    tag: "tier2-7d",
    days: 7,
    build: ({ name, title, total, link }) =>
      `Hi ${name} — the ${title} quote (${total}) is still open if the timing works. Reply with a date and I&apos;ll lock it in. ${link}`,
  },
  {
    tag: "tier3-14d",
    days: 14,
    build: ({ name, title, link }) =>
      `${name}, last check on the ${title} quote — prices may shift after this week with material changes. ${link}`,
  },
];

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const now = Date.now();
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://contractorflow.app";

  const { data: rows } = await admin
    .from("proposals")
    .select("id,user_id,customer_id,title,status,total_cents,share_token,sent_at,customer_signature,internal_notes")
    .eq("status", "sent")
    .is("customer_signature", null)
    .not("sent_at", "is", null)
    .not("customer_id", "is", null)
    .limit(200);

  const proposals = (rows ?? []) as ProposalRow[];
  let sent = 0;
  let skipped = 0;

  for (const p of proposals) {
    if (!p.sent_at || !p.customer_id) { skipped++; continue; }
    const ageDays = Math.floor((now - new Date(p.sent_at).getTime()) / 86_400_000);

    const tier = [...TIERS].reverse().find((t) =>
      ageDays >= t.days && !(p.internal_notes ?? "").includes(t.tag));
    if (!tier) { skipped++; continue; }

    const { data: cust } = await admin
      .from("customers").select("id,phone,name").eq("id", p.customer_id).single();
    const c = cust as CustomerRow | null;
    if (!c?.phone) { skipped++; continue; }

    const link = `${origin}/p/${p.share_token}`;
    const message = tier.build({
      name: c.name?.split(" ")[0] ?? "there",
      title: p.title,
      total: `$${(p.total_cents / 100).toFixed(0)}`,
      link,
    });
    const result = await sendSms(c.phone, message);
    if (!result.ok) { skipped++; continue; }

    const newNotes = `${p.internal_notes ?? ""}\n[${new Date().toISOString().slice(0, 10)}] ${tier.tag} sent`.trim();
    await admin.from("proposals").update({ internal_notes: newNotes }).eq("id", p.id);
    sent++;
  }

  return NextResponse.json({
    ok: true,
    considered: proposals.length,
    sent,
    skipped,
  });
}

export async function POST(request: Request) { return GET(request); }
