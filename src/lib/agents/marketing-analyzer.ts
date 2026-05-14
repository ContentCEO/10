import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentActionLog } from "@/app/api/agents/tick/route";

/*
 * Marketing Source Analyzer.
 *
 * Daily rollup: for every source_channel in the last lookback_days,
 *   - count of leads
 *   - count of "won" jobs that trace back to that source via marketplace_leads
 *   - implied conversion rate
 *   - implied revenue per lead (where jobs.price is set)
 *
 * Emits one action with the digest, plus separate flagged actions for any
 * source that's underperforming (conversion < 1%) so owner can decide to
 * pause it.
 */

interface Config {
  lookback_days?: number;
  underperform_conversion?: number;
}

interface Lead { id: string; source_channel: string; bought_by: string | null; buyer_id: string | null; }
interface Job  { lead_id: string | null; price: number | null; status: string; }

export async function runMarketingAnalyzer(config: Config): Promise<AgentActionLog[]> {
  const days = Number(config.lookback_days ?? 30);
  const underperform = Number(config.underperform_conversion ?? 0.01);
  const admin = createAdminClient();

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data: leads } = await admin
    .from("marketplace_leads")
    .select("id,source_channel,bought_by,buyer_id")
    .gte("created_at", since)
    .limit(10_000);

  const { data: jobs } = await admin
    .from("jobs")
    .select("lead_id,price,status")
    .gte("created_at", since)
    .eq("status", "completed")
    .limit(10_000);

  type Stat = { leads: number; jobs: number; revenue: number };
  const bySource = new Map<string, Stat>();

  const leadsBySource = new Map<string, Set<string>>();
  for (const l of (leads ?? []) as Lead[]) {
    const ch = l.source_channel ?? "unknown";
    if (!bySource.has(ch)) bySource.set(ch, { leads: 0, jobs: 0, revenue: 0 });
    bySource.get(ch)!.leads++;
    if (!leadsBySource.has(ch)) leadsBySource.set(ch, new Set());
    leadsBySource.get(ch)!.add(l.id);
  }

  const leadIdToSource = new Map<string, string>();
  for (const [ch, ids] of leadsBySource.entries()) for (const id of ids) leadIdToSource.set(id, ch);

  for (const j of (jobs ?? []) as Job[]) {
    if (!j.lead_id) continue;
    const ch = leadIdToSource.get(j.lead_id);
    if (!ch) continue;
    const s = bySource.get(ch)!;
    s.jobs++;
    s.revenue += j.price ?? 0;
  }

  const actions: AgentActionLog[] = [];
  const summary = Array.from(bySource.entries()).map(([ch, s]) => ({
    source: ch,
    leads: s.leads,
    jobs: s.jobs,
    revenue: s.revenue,
    conversion: s.leads > 0 ? s.jobs / s.leads : 0,
    rev_per_lead: s.leads > 0 ? s.revenue / s.leads : 0,
  })).sort((a, b) => b.revenue - a.revenue);

  if (summary.length > 0) {
    const top = summary.slice(0, 3).map((s) => `${s.source} ($${Math.round(s.revenue)})`).join(", ");
    actions.push({
      action_type: "source_roi_digest",
      target_table: "marketplace_leads",
      summary: `${days}-day source ROI · top: ${top || "(no wins yet)"}`,
      details: { lookback_days: days, by_source: summary },
    });

    // Flag underperformers (only those with meaningful lead volume).
    for (const s of summary) {
      if (s.leads >= 50 && s.conversion < underperform) {
        actions.push({
          action_type: "underperforming_source",
          target_table: "marketplace_leads",
          target_id: s.source,
          summary: `${s.source} · ${s.leads} leads / ${s.jobs} jobs · ${(s.conversion * 100).toFixed(1)}% conversion`,
          details: { ...s },
          requires_approval: true,
        });
      }
    }
  }

  return actions;
}
