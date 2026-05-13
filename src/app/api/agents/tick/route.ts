import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";
import { runLeadTriage } from "@/lib/agents/lead-triage";

export const runtime = "nodejs";

// Agent orchestrator. Cron hits this every 5 min; we look up which agents
// are due (next_due_at <= now()), run each, log actions to agent_actions,
// and reschedule. Each agent is a small function in src/lib/agents.
//
// Adding a new agent: write a function in src/lib/agents/<slug>.ts that
// returns ActionLog[], then map slug → function below.

interface AgentRow {
  id: string;
  slug: string;
  cadence_minutes: number;
  config: Record<string, unknown>;
  enabled: boolean;
  last_ran_at: string | null;
}

export interface AgentActionLog {
  action_type: string;
  target_table?: string | null;
  target_id?: string | null;
  summary: string;
  details?: Record<string, unknown>;
  requires_approval?: boolean;
}

// Registry: slug → runner. Add a line per agent as we implement them.
const RUNNERS: Record<string, (config: Record<string, unknown>) => Promise<AgentActionLog[]>> = {
  "lead-triage": runLeadTriage,
  // followup-drafter, appointment-scheduler, etc. — coming next.
};

async function runOnce() {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: due } = await admin
    .from("agents")
    .select("id,slug,cadence_minutes,config,enabled,last_ran_at")
    .eq("enabled", true)
    .or(`next_due_at.is.null,next_due_at.lte.${nowIso}`)
    .order("next_due_at", { ascending: true, nullsFirst: true })
    .limit(20);

  const results: Record<string, { actions: number; error?: string; skipped?: boolean }> = {};

  for (const a of (due ?? []) as AgentRow[]) {
    const runner = RUNNERS[a.slug];
    if (!runner) {
      // No code yet — just bump the schedule so we don't tight-loop.
      results[a.slug] = { actions: 0, skipped: true };
      const nextDue = new Date(Date.now() + a.cadence_minutes * 60_000).toISOString();
      await admin.from("agents").update({ last_ran_at: nowIso, next_due_at: nextDue }).eq("id", a.id);
      continue;
    }

    let actions: AgentActionLog[] = [];
    let runError: string | undefined;
    try {
      actions = await runner(a.config ?? {});
    } catch (e) {
      runError = e instanceof Error ? e.message : "agent threw";
    }

    if (actions.length > 0) {
      const rows = actions.map((act) => ({
        agent_id: a.id,
        agent_slug: a.slug,
        action_type: act.action_type,
        target_table: act.target_table ?? null,
        target_id: act.target_id ?? null,
        summary: act.summary,
        details: act.details ?? {},
        requires_approval: act.requires_approval ?? false,
      }));
      await admin.from("agent_actions").insert(rows);
    }

    const nextDue = new Date(Date.now() + a.cadence_minutes * 60_000).toISOString();
    await admin.from("agents").update({ last_ran_at: nowIso, next_due_at: nextDue }).eq("id", a.id);
    results[a.slug] = { actions: actions.length, error: runError };
  }

  return { ran: Object.keys(results).length, results };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runOnce();
  return NextResponse.json({ ok: true, source: "agents", ...result });
}

export async function POST(request: Request) { return GET(request); }
