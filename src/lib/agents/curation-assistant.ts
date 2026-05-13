import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentActionLog } from "@/app/api/agents/tick/route";

/*
 * Curation Assistant.
 *
 * Reviews leads in the curation queue (marketplace_leads.requires_curation = true,
 * curated_at IS NULL). Auto-approves the obvious good ones:
 *   - ai_score >= auto_approve_score
 *   - has city or address
 *   - has service_type
 *
 * Flags the questionable ones (low score, missing fields) for owner review.
 * Reduces the pile from "scraper outputs" to "publishable marketplace leads".
 */

interface Config {
  auto_approve_score?: number;
}

interface LeadRow {
  id: string;
  name: string | null;
  service_type: string | null;
  city: string | null;
  ai_score: number | null;
  source_channel: string;
  notes: string | null;
  created_at: string;
}

export async function runCurationAssistant(config: Config): Promise<AgentActionLog[]> {
  const autoApproveScore = Number(config.auto_approve_score ?? 90);
  const admin = createAdminClient();

  const { data: pending } = await admin
    .from("marketplace_leads")
    .select("id,name,service_type,city,ai_score,source_channel,notes,created_at")
    .eq("requires_curation", true)
    .is("curated_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const actions: AgentActionLog[] = [];

  for (const l of (pending ?? []) as LeadRow[]) {
    const hasService = l.service_type && l.service_type.length > 3;
    const hasCity = l.city && l.city.length > 1;
    const hasBody = l.notes && l.notes.length > 30;
    const score = l.ai_score ?? 0;

    if (score >= autoApproveScore && hasService && hasCity && hasBody) {
      // Auto-approve.
      const { error } = await admin
        .from("marketplace_leads")
        .update({
          requires_curation: false,
          curated_at: new Date().toISOString(),
          status: "available",
        })
        .eq("id", l.id);
      if (!error) {
        actions.push({
          action_type: "auto_approved_lead",
          target_table: "marketplace_leads",
          target_id: l.id,
          summary: `Auto-approved · ${l.service_type} · ${l.city} · score ${score}`,
          details: { score, source: l.source_channel },
        });
      }
    } else if (score < 30 || !hasService || !hasBody) {
      // Auto-reject low-quality ones to keep the queue clean.
      const { error } = await admin
        .from("marketplace_leads")
        .update({
          requires_curation: false,
          curated_at: new Date().toISOString(),
          status: "expired",
        })
        .eq("id", l.id);
      if (!error) {
        actions.push({
          action_type: "auto_rejected_lead",
          target_table: "marketplace_leads",
          target_id: l.id,
          summary: `Auto-rejected · low signal · score ${score} · ${l.source_channel}`,
          details: { score, has_service: hasService, has_city: hasCity, has_body: hasBody },
        });
      }
    } else {
      // Middle ground — flag for owner review (but don't double-flag).
      const { count: existing } = await admin
        .from("agent_actions").select("id", { count: "exact", head: true })
        .eq("agent_slug", "curation-assistant")
        .eq("action_type", "flagged_for_review")
        .eq("target_id", l.id);
      if ((existing ?? 0) === 0) {
        actions.push({
          action_type: "flagged_for_review",
          target_table: "marketplace_leads",
          target_id: l.id,
          summary: `Needs your call · ${l.service_type ?? "?"} · ${l.city ?? "?"} · score ${score}`,
          details: { score, source: l.source_channel, notes_preview: (l.notes ?? "").slice(0, 120) },
          requires_approval: true,
        });
      }
    }
  }

  return actions;
}
