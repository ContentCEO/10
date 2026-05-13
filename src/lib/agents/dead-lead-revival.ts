import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentActionLog } from "@/app/api/agents/tick/route";

/*
 * Dead Lead Revival.
 *
 * Scans leads with status='lost' that haven't been touched in `dead_after_days`.
 * Drafts a polite re-engagement message ("Still considering X? Free quote
 * still on the table"). Queued for owner approval before send.
 */

interface Config { dead_after_days?: number; }

interface Lead {
  id: string;
  name: string;
  service_type: string | null;
  user_id: string;
  status: string;
  updated_at: string;
}

interface Profile {
  business_name: string | null;
  preferences: { ai_tone?: string } | null;
}

export async function runDeadLeadRevival(config: Config): Promise<AgentActionLog[]> {
  const deadDays = Number(config.dead_after_days ?? 60);
  const admin = createAdminClient();

  const cutoff = new Date(Date.now() - deadDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: dead } = await admin
    .from("leads")
    .select("id,name,service_type,user_id,status,updated_at")
    .eq("status", "lost")
    .lte("updated_at", cutoff)
    .limit(20);

  const actions: AgentActionLog[] = [];

  for (const l of (dead ?? []) as Lead[]) {
    // Skip if revival already drafted recently.
    const { count: existing } = await admin
      .from("agent_actions").select("id", { count: "exact", head: true })
      .eq("agent_slug", "dead-lead-revival")
      .eq("target_id", l.id)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    if ((existing ?? 0) > 0) continue;

    const { data: profile } = await admin
      .from("profiles").select("business_name,preferences").eq("id", l.user_id).maybeSingle() as { data: Profile | null };
    const business = profile?.business_name ?? "your contractor";
    const name = l.name.split(" ")[0];
    const svc = l.service_type ?? "your project";

    const sms = `Hey ${name} — ${business} here. We touched base ~${deadDays} days ago about ${svc}. Still considering it? Happy to send updated pricing if so. – ${business}`;
    const email = {
      subject: `Quick check-in · ${svc}`,
      body: `Hi ${name},\n\nIt's been about ${deadDays} days since we last talked about ${svc}. Wanted to check in — if it's still on the table, I can send fresh pricing or come out for a no-pressure look.\n\nIf you went with someone else, totally fine, just let me know and I'll close the file.\n\n${business}`,
    };

    actions.push({
      action_type: "drafted_revival",
      target_table: "leads",
      target_id: l.id,
      summary: `Revival draft · ${name} · ${svc} · ${deadDays}d cold`,
      details: { sms, email, business },
      requires_approval: true,
    });
  }

  return actions;
}
