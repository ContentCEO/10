import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Owner Mission Control data feed. Polled every ~10s by the dashboard.
// Returns agent roster, recent actions, pending approvals, and per-account
// rollups so the owner sees everyone's business at a glance.

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!me?.is_admin) return NextResponse.json({ error: "Not admin" }, { status: 403 });

  const admin = createAdminClient();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Agents
  const { data: agents } = await admin
    .from("agents")
    .select("id,slug,name,description,category,enabled,cadence_minutes,last_ran_at,next_due_at")
    .order("category").order("name");

  // Actions count per agent (last 24h)
  const { data: actionsRaw } = await admin
    .from("agent_actions")
    .select("agent_slug")
    .gte("created_at", since24h);
  const actionsByAgent = new Map<string, number>();
  for (const a of (actionsRaw ?? []) as Array<{ agent_slug: string }>) {
    actionsByAgent.set(a.agent_slug, (actionsByAgent.get(a.agent_slug) ?? 0) + 1);
  }

  // Recent actions (latest 30)
  const { data: recentActions } = await admin
    .from("agent_actions")
    .select("id,agent_slug,action_type,target_table,target_id,summary,requires_approval,approved,applied,created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  // Pending approval queue
  const { data: pending } = await admin
    .from("agent_actions")
    .select("id,agent_slug,action_type,target_table,target_id,summary,details,created_at")
    .eq("requires_approval", true)
    .is("approved", null)
    .order("created_at", { ascending: false })
    .limit(20);

  // Cross-account rollups
  const { count: totalAccounts } = await admin
    .from("profiles").select("id", { count: "exact", head: true });
  const { count: contractorAccounts } = await admin
    .from("profiles").select("id", { count: "exact", head: true })
    .eq("account_type", "contractor");
  const { count: totalLeads } = await admin
    .from("marketplace_leads").select("id", { count: "exact", head: true });
  const { count: leads24h } = await admin
    .from("marketplace_leads").select("id", { count: "exact", head: true })
    .gte("created_at", since24h);
  const { count: jobsActive } = await admin
    .from("jobs").select("id", { count: "exact", head: true })
    .in("status", ["scheduled", "in_progress"]);
  const { count: customersTotal } = await admin
    .from("customers").select("id", { count: "exact", head: true });

  return NextResponse.json({
    ok: true,
    generated_at: new Date().toISOString(),
    rollups: {
      total_accounts:      totalAccounts ?? 0,
      contractor_accounts: contractorAccounts ?? 0,
      total_leads:         totalLeads ?? 0,
      leads_24h:           leads24h ?? 0,
      jobs_active:         jobsActive ?? 0,
      customers_total:     customersTotal ?? 0,
    },
    agents: ((agents ?? []) as Array<{
      slug: string; name: string; description: string; category: string;
      enabled: boolean; cadence_minutes: number; last_ran_at: string | null;
      next_due_at: string | null;
    }>).map((a) => ({ ...a, actions_24h: actionsByAgent.get(a.slug) ?? 0 })),
    recent_actions: recentActions ?? [],
    pending_approval: pending ?? [],
  });
}
