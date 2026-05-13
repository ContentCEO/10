import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentActionLog } from "@/app/api/agents/tick/route";

/*
 * Review Requester.
 *
 * Detects jobs marked 'completed' more than `wait_days` ago with no review
 * recorded. Drafts a polite review-request message. Owner approval before send.
 */

interface Config { wait_days?: number; }

interface JobRow {
  id: string;
  user_id: string;
  customer_id: string | null;
  title: string | null;
  status: string;
  completed_at: string | null;
  updated_at: string;
}

interface Profile {
  business_name: string | null;
  preferences: { ai_tone?: string } | null;
}

export async function runReviewRequester(config: Config): Promise<AgentActionLog[]> {
  const waitDays = Number(config.wait_days ?? 3);
  const admin = createAdminClient();

  const cutoff = new Date(Date.now() - waitDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: jobs } = await admin
    .from("jobs")
    .select("id,user_id,customer_id,title,status,completed_at,updated_at")
    .eq("status", "completed")
    .lte("completed_at", cutoff)
    .limit(30);

  const actions: AgentActionLog[] = [];

  for (const j of (jobs ?? []) as JobRow[]) {
    if (!j.customer_id) continue;
    // Skip if review already drafted for this job.
    const { count: existing } = await admin
      .from("agent_actions").select("id", { count: "exact", head: true })
      .eq("agent_slug", "review-requester")
      .eq("target_id", j.id);
    if ((existing ?? 0) > 0) continue;

    const { data: profile } = await admin
      .from("profiles").select("business_name,preferences").eq("id", j.user_id).maybeSingle() as { data: Profile | null };
    const business = profile?.business_name ?? "your contractor";

    const sms = `Hey — ${business} here. Hope you're loving the ${j.title ?? "work"} we wrapped up. Mind dropping us a quick review? Even one line helps a ton. ${business}`;
    const email = {
      subject: `Quick favor · ${j.title ?? "your project"}`,
      body: `Hi,\n\nHope everything's looking great with the ${j.title ?? "work"} we finished. If you have 30 seconds, a short review would mean a lot — it's how small shops like ours grow.\n\nReply with anything, even one line, and I'll handle posting it.\n\nThank you,\n${business}`,
    };

    actions.push({
      action_type: "drafted_review_request",
      target_table: "jobs",
      target_id: j.id,
      summary: `Review request · ${j.title ?? "job"} · ${business}`,
      details: { sms, email, customer_id: j.customer_id, business },
      requires_approval: true,
    });
  }

  return actions;
}
