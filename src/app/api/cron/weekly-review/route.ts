import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/messaging";

export const runtime = "nodejs";
export const maxDuration = 60;

// AI weekly business review. Runs Sunday morning. For each contractor:
//   1. Pull last 7 days of leads, jobs completed, invoices paid, etc.
//   2. Build a short metrics summary
//   3. Ask Claude Haiku to write a 4-paragraph review with 3 action items
//   4. Email it to the contractor
//
// One-shot, opinionated, designed to be read in 2 minutes Sunday night.

interface ProfileRow {
  id: string;
  email: string | null;
  business_name: string | null;
}

const SYSTEM = `You write Monday-morning business reviews for contractors.
Given a week's metrics, write a tight 3-4 paragraph review with:
  Para 1: What went well (specific numbers)
  Para 2: What didn't (specific numbers)
  Para 3: Three concrete action items for the coming week
Tone: direct, no fluff, plain text only (no markdown). Max 300 words.`;

async function buildMetrics(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const now = new Date();
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
  const prevWeekStart = new Date(weekStart); prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const isoWeek = weekStart.toISOString();
  const isoPrev = prevWeekStart.toISOString();
  const isoNow  = now.toISOString();

  const [
    { count: newLeadsWk },
    { count: newLeadsPrev },
    { data: wonWk },
    { data: completedJobsWk },
    { data: paidInvWk },
    { count: dueFollowUpsCount },
    { count: openLeads },
  ] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", isoWeek),
    admin.from("leads").select("id", { count: "exact", head: true })
      .eq("user_id", userId).gte("created_at", isoPrev).lt("created_at", isoWeek),
    admin.from("leads").select("price,service_type")
      .eq("user_id", userId).eq("status", "won")
      .gte("updated_at", isoWeek).lt("updated_at", isoNow),
    admin.from("jobs").select("price,title")
      .eq("user_id", userId).eq("status", "completed")
      .gte("updated_at", isoWeek).lt("updated_at", isoNow),
    admin.from("invoices").select("amount_cents")
      .eq("user_id", userId).eq("status", "paid")
      .gte("paid_at", isoWeek).lt("paid_at", isoNow),
    admin.from("follow_ups").select("id", { count: "exact", head: true })
      .eq("user_id", userId).is("completed_at", null)
      .lt("due_at", isoNow),
    admin.from("leads").select("id", { count: "exact", head: true })
      .eq("user_id", userId).not("status", "in", "(won,lost)"),
  ]);

  const wonRevenue = ((wonWk ?? []) as { price: number | null }[])
    .reduce((s, l) => s + (l.price ?? 0), 0);
  const completedJobsRevenue = ((completedJobsWk ?? []) as { price: number | null }[])
    .reduce((s, j) => s + (j.price ?? 0), 0);
  const paidRevenue = ((paidInvWk ?? []) as { amount_cents: number }[])
    .reduce((s, i) => s + i.amount_cents, 0) / 100;

  return {
    new_leads:           newLeadsWk ?? 0,
    new_leads_prev:      newLeadsPrev ?? 0,
    won_count:           (wonWk ?? []).length,
    won_revenue:         wonRevenue,
    completed_jobs:      (completedJobsWk ?? []).length,
    completed_revenue:   completedJobsRevenue,
    paid_invoice_total:  paidRevenue,
    overdue_followups:   dueFollowUpsCount ?? 0,
    open_pipeline_count: openLeads ?? 0,
  };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();

  const { data: profs } = await admin
    .from("profiles")
    .select("id,email,business_name")
    .eq("account_type", "contractor")
    .not("email", "is", null);
  const profiles = (profs ?? []) as ProfileRow[];

  const haveAI = !!process.env.ANTHROPIC_API_KEY;
  const client = haveAI ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }) : null;

  let sent = 0;
  let skipped = 0;

  for (const p of profiles) {
    if (!p.email) { skipped++; continue; }
    const m = await buildMetrics(admin, p.id);

    // Skip super-quiet weeks to avoid noise.
    if (m.new_leads === 0 && m.completed_jobs === 0 && m.paid_invoice_total === 0) {
      skipped++; continue;
    }

    const leadDelta = m.new_leads - m.new_leads_prev;
    const numbersBlock = [
      `New leads this week: ${m.new_leads} (vs ${m.new_leads_prev} prior, ${leadDelta >= 0 ? "+" : ""}${leadDelta})`,
      `Deals won: ${m.won_count} ($${m.won_revenue.toLocaleString()})`,
      `Jobs completed: ${m.completed_jobs} ($${m.completed_revenue.toLocaleString()})`,
      `Invoices paid: $${m.paid_invoice_total.toLocaleString()}`,
      `Overdue follow-ups: ${m.overdue_followups}`,
      `Open pipeline: ${m.open_pipeline_count} active leads`,
    ].join("\n");

    let aiReview = "";
    if (client) {
      try {
        const res = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: SYSTEM,
          messages: [{ role: "user", content: numbersBlock }],
        });
        const text = res.content.find((b) => b.type === "text");
        if (text && text.type === "text") aiReview = text.text.trim();
      } catch { /* fall through to template */ }
    }

    const body = aiReview
      ? `Hey ${p.business_name ?? "there"},\n\nYour week:\n\n${aiReview}\n\n— ContractorFlow\n\n— — —\nThis week by the numbers:\n${numbersBlock}`
      : `Hey ${p.business_name ?? "there"},\n\nThis week by the numbers:\n\n${numbersBlock}\n\n— ContractorFlow`;

    const subject = `Weekly review · ${m.new_leads} new leads, $${Math.round(m.completed_revenue).toLocaleString()} in jobs`;
    const result = await sendEmail(p.email, subject, body);
    if (result.ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, considered: profiles.length, sent, skipped });
}

export async function POST(request: Request) { return GET(request); }
