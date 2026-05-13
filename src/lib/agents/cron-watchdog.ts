import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentActionLog } from "@/app/api/agents/tick/route";

/*
 * Cron Watchdog.
 *
 * Looks at every distinct source in scraper_runs and computes "expected
 * interval" from the recent run history. If any source has not run in
 * `alert_multiplier × interval`, raise a flagged alert.
 *
 * Catches broken crons, deleted env vars, paused scrapers.
 */

interface Config {
  alert_multiplier?: number;
}

interface Run {
  source: string;
  ran_at: string;
}

export async function runCronWatchdog(config: Config): Promise<AgentActionLog[]> {
  const multiplier = Number(config.alert_multiplier ?? 2);
  const admin = createAdminClient();

  const since48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: runs } = await admin
    .from("scraper_runs")
    .select("source,ran_at")
    .gte("ran_at", since48h)
    .order("ran_at", { ascending: false })
    .limit(2000);

  // Group by source, sort runs newest first per source.
  const bySource = new Map<string, Run[]>();
  for (const r of (runs ?? []) as Run[]) {
    if (!bySource.has(r.source)) bySource.set(r.source, []);
    bySource.get(r.source)!.push(r);
  }

  const actions: AgentActionLog[] = [];
  const now = Date.now();

  for (const [source, list] of bySource.entries()) {
    if (list.length < 3) continue; // need enough history to compute interval

    // Compute median interval (in minutes) between successive runs.
    const intervals: number[] = [];
    for (let i = 0; i < list.length - 1; i++) {
      const diff = new Date(list[i].ran_at).getTime() - new Date(list[i + 1].ran_at).getTime();
      if (diff > 0) intervals.push(diff / 60_000);
    }
    if (intervals.length === 0) continue;
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    const lastRanMinAgo = (now - new Date(list[0].ran_at).getTime()) / 60_000;

    if (lastRanMinAgo > median * multiplier) {
      // Don't repeat-alert: only emit if no recent alert for this source.
      const since6h = new Date(now - 6 * 60 * 60 * 1000).toISOString();
      const { count: recentAlerts } = await admin
        .from("agent_actions").select("id", { count: "exact", head: true })
        .eq("agent_slug", "cron-watchdog")
        .eq("action_type", "stale_scraper")
        .eq("target_id", source)
        .gte("created_at", since6h);
      if ((recentAlerts ?? 0) === 0) {
        actions.push({
          action_type: "stale_scraper",
          target_table: "scraper_runs",
          target_id: source,
          summary: `Scraper "${source}" hasn't run in ${Math.round(lastRanMinAgo)}m (expected ~${Math.round(median)}m).`,
          details: {
            median_interval_min: Math.round(median),
            last_ran_minutes_ago: Math.round(lastRanMinAgo),
            multiplier,
          },
          requires_approval: false,
        });
      }
    }
  }

  return actions;
}
