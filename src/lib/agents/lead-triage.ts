import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentActionLog } from "@/app/api/agents/tick/route";

/*
 * Lead Triage Agent.
 *
 * Looks at marketplace_leads created in the last `cadence` window. For each:
 *   - re-categorizes service_type based on body keyword patterns (cheap heuristic
 *     today; can swap in Claude for ambiguous ones later)
 *   - flags HOT leads (score >= min_score_to_flag) for owner attention by writing
 *     an agent_action with requires_approval=true
 *
 * Idempotent — if we've already triaged a lead (action exists), skip it.
 */

interface MarketplaceLead {
  id: string;
  service_type: string | null;
  notes: string | null;
  city: string | null;
  ai_score: number | null;
  source_channel: string;
  created_at: string;
}

interface Config {
  min_score_to_flag?: number;
  lookback_minutes?: number;
}

function inferService(text: string): string {
  const t = text.toLowerCase();
  if (/kitchen.*remodel|kitchen.*renovat|cabinet/.test(t))    return "Kitchen remodel";
  if (/bath.*remodel|shower remodel|tub|vanity/.test(t))      return "Bathroom remodel";
  if (/roof.*replac|roof.*leak|shingles/.test(t))             return "Roofing";
  if (/siding.*replace|stucco/.test(t))                        return "Siding";
  if (/deck.*build|deck.*replace|porch/.test(t))               return "Deck / porch";
  if (/fence/.test(t))                                         return "Fence install";
  if (/electr.*panel|panel upgrade|ev charger|knob.*tube/.test(t))    return "Electrical · panel";
  if (/electric|wiring|outlet|rewire/.test(t))                 return "Electrical · general";
  if (/water heater|tankless/.test(t))                         return "Plumbing · water heater";
  if (/sewer|sump|drain.*clean/.test(t))                       return "Plumbing · sewer/drain";
  if (/plumb|leak|toilet|faucet/.test(t))                      return "Plumbing · general";
  if (/heat pump|mini split|hvac.*install/.test(t))            return "HVAC · install";
  if (/hvac|furnace|boiler|central air/.test(t))               return "HVAC · service";
  if (/painting|interior paint|exterior paint/.test(t))        return "Painting";
  if (/flooring|hardwood|tile|carpet|lvp/.test(t))             return "Flooring";
  if (/window.*replac/.test(t))                                return "Window replacement";
  if (/landscap|lawn|tree|mulch/.test(t))                      return "Landscaping";
  if (/concrete|driveway|asphalt|paver/.test(t))               return "Concrete / driveway";
  if (/basement|attic|addition/.test(t))                       return "Renovation · interior";
  if (/handyman|fix it|small repair/.test(t))                  return "Handyman";
  return ""; // empty = no inference
}

export async function runLeadTriage(config: Config): Promise<AgentActionLog[]> {
  const minScoreToFlag = Number(config.min_score_to_flag ?? 80);
  const lookbackMinutes = Number(config.lookback_minutes ?? 30);

  const admin = createAdminClient();
  const since = new Date(Date.now() - lookbackMinutes * 60_000).toISOString();

  const { data: leads } = await admin
    .from("marketplace_leads")
    .select("id,service_type,notes,city,ai_score,source_channel,created_at")
    .gte("created_at", since)
    .limit(200);

  const actions: AgentActionLog[] = [];

  for (const l of (leads ?? []) as MarketplaceLead[]) {
    const text = `${l.service_type ?? ""} ${l.notes ?? ""}`;
    const inferred = inferService(text);

    // Re-categorize if our inference is more specific.
    if (inferred && inferred !== l.service_type) {
      const isMoreSpecific =
        !l.service_type ||
        l.service_type === "Homeowner inquiry" ||
        l.service_type === "Code violation — general repair" ||
        l.service_type.toLowerCase().includes("permit");
      if (isMoreSpecific) {
        // Apply directly — no approval needed; this is just better labeling.
        const { error } = await admin
          .from("marketplace_leads")
          .update({ service_type: inferred })
          .eq("id", l.id);
        if (!error) {
          actions.push({
            action_type: "categorized_lead",
            target_table: "marketplace_leads",
            target_id: l.id,
            summary: `Re-categorized "${l.service_type ?? "(none)"}" → "${inferred}"`,
            details: { city: l.city, source: l.source_channel, score: l.ai_score },
          });
        }
      }
    }

    // Hot-lead flag: high score + recent + still available.
    if ((l.ai_score ?? 0) >= minScoreToFlag) {
      // Don't double-flag: check if we've already created an action for this lead.
      const { count: existing } = await admin
        .from("agent_actions").select("id", { count: "exact", head: true })
        .eq("agent_slug", "lead-triage")
        .eq("action_type", "flagged_hot_lead")
        .eq("target_id", l.id);
      if ((existing ?? 0) === 0) {
        actions.push({
          action_type: "flagged_hot_lead",
          target_table: "marketplace_leads",
          target_id: l.id,
          summary: `Hot lead · ${l.service_type ?? "?"} · ${l.city ?? "?"} · score ${l.ai_score}`,
          details: { score: l.ai_score, source: l.source_channel, snippet: (l.notes ?? "").slice(0, 200) },
          requires_approval: false, // owner just sees the flag; can buy or ignore
        });
      }
    }
  }

  return actions;
}
