import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentActionLog } from "@/app/api/agents/tick/route";

/*
 * Customer Health Monitor.
 *
 * Identifies customers with no contact in `stale_days`. Flags them so the
 * contractor (or another agent) can schedule a check-in. Repeat customers
 * are the cheapest leads in the business.
 */

interface Config { stale_days?: number; }

interface Customer {
  id: string;
  name: string | null;
  user_id: string;
  last_contacted_at: string | null;
  created_at: string;
}

export async function runCustomerHealth(config: Config): Promise<AgentActionLog[]> {
  const staleDays = Number(config.stale_days ?? 45);
  const admin = createAdminClient();

  const cutoff = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();

  // Customers whose last_contacted_at (or created_at fallback) is older than cutoff.
  const { data: customers } = await admin
    .from("customers")
    .select("id,name,user_id,last_contacted_at,created_at")
    .or(`last_contacted_at.lte.${cutoff},and(last_contacted_at.is.null,created_at.lte.${cutoff})`)
    .limit(30);

  const actions: AgentActionLog[] = [];

  for (const c of (customers ?? []) as Customer[]) {
    // Don't repeat-flag for the same customer within 14 days.
    const { count: existing } = await admin
      .from("agent_actions").select("id", { count: "exact", head: true })
      .eq("agent_slug", "customer-health")
      .eq("target_id", c.id)
      .gte("created_at", new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());
    if ((existing ?? 0) > 0) continue;

    const lastTouch = c.last_contacted_at ?? c.created_at;
    const daysSince = Math.floor((Date.now() - new Date(lastTouch).getTime()) / (24 * 60 * 60 * 1000));

    actions.push({
      action_type: "stale_customer",
      target_table: "customers",
      target_id: c.id,
      summary: `${c.name ?? "Customer"} hasn't been contacted in ${daysSince}d. Suggest a check-in.`,
      details: { customer_id: c.id, days_since_contact: daysSince, owner_user_id: c.user_id },
      requires_approval: false,
    });
  }

  return actions;
}
