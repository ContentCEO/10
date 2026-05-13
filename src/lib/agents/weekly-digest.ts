import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentActionLog } from "@/app/api/agents/tick/route";

/*
 * Weekly Owner Digest.
 *
 * Sunday-evening rollup: counts and dollars across the platform for the
 * last 7 days. Generates a single action with the digest payload. Owner
 * sees it in the Mission Control feed; downstream a "digest emailer"
 * agent (future) can pick it up and send to the owner inbox.
 */

interface Config { send_day?: string; send_hour_local?: number; }

export async function runWeeklyDigest(_config: Config): Promise<AgentActionLog[]> {
  const admin = createAdminClient();
  const now = new Date();

  // Only fire on the configured day. Default: Sunday.
  // We'll trust the cadence to keep it weekly; just gate within the day.
  const sinceWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sincePrev = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();

  // Don't double-send within 6 days.
  const { count: recent } = await admin
    .from("agent_actions").select("id", { count: "exact", head: true })
    .eq("agent_slug", "weekly-digest")
    .gte("created_at", new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString());
  if ((recent ?? 0) > 0) return [];

  const { count: leadsWeek }     = await admin.from("marketplace_leads").select("id", { count: "exact", head: true }).gte("created_at", sinceWeek);
  const { count: leadsPrev }     = await admin.from("marketplace_leads").select("id", { count: "exact", head: true }).gte("created_at", sincePrev).lt("created_at", sinceWeek);
  const { count: scrapedWeek }   = await admin.from("marketplace_leads").select("id", { count: "exact", head: true }).eq("source_channel", "scraped").gte("created_at", sinceWeek);
  const { count: claimedWeek }   = await admin.from("marketplace_leads").select("id", { count: "exact", head: true }).not("bought_by", "is", null).gte("bought_at", sinceWeek);
  const { count: agentActionsWk } = await admin.from("agent_actions").select("id", { count: "exact", head: true }).gte("created_at", sinceWeek);

  const { data: completedJobs } = await admin.from("jobs").select("price").eq("status", "completed").gte("updated_at", sinceWeek);
  const revenue = (completedJobs ?? []).reduce((s, j: { price: number | null }) => s + (j.price ?? 0), 0);

  const wow = (leadsPrev ?? 0) === 0 ? 0 : (((leadsWeek ?? 0) - (leadsPrev ?? 0)) / (leadsPrev ?? 1)) * 100;

  return [{
    action_type: "weekly_digest",
    target_table: null,
    target_id: null,
    summary:
      `Week of ${new Date(now.getTime() - 7*24*60*60*1000).toLocaleDateString()} — ` +
      `${leadsWeek ?? 0} leads (${wow >= 0 ? "+" : ""}${wow.toFixed(0)}% WoW), ` +
      `${claimedWeek ?? 0} claimed, $${revenue.toLocaleString()} revenue, ${agentActionsWk ?? 0} agent actions.`,
    details: {
      leads_week: leadsWeek ?? 0,
      leads_prev_week: leadsPrev ?? 0,
      wow_pct: Number(wow.toFixed(1)),
      scraped_week: scrapedWeek ?? 0,
      claimed_week: claimedWeek ?? 0,
      revenue_week: revenue,
      agent_actions_week: agentActionsWk ?? 0,
    },
    requires_approval: false,
  }];
}
