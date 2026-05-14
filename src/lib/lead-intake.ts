import type { SupabaseClient } from "@supabase/supabase-js";
import { generateText } from "@/lib/ai";
import {
  BUDGET_LABELS,
  TIMELINE_LABELS,
  type BudgetTier,
  type TimelineTier,
} from "@/lib/marketplace";

export type LeadSourceChannel =
  | "google_ads"
  | "meta_facebook"
  | "meta_instagram"
  | "website_form"
  | "marketplace_form"
  | "webhook"
  | "manual"
  | "scraped";

export const SOURCE_CHANNEL_LABELS: Record<LeadSourceChannel, string> = {
  google_ads:       "Google Ads",
  meta_facebook:    "Facebook Ads",
  meta_instagram:   "Instagram Ads",
  website_form:     "Website form",
  marketplace_form: "Find-a-pro form",
  webhook:          "Webhook",
  manual:           "Manual",
  scraped:          "Scraped",
};

// Intent-quality multipliers per source — Google search clicks indicate
// the highest buyer intent; cold scraping the lowest.
const SOURCE_PRICE_MULTIPLIER: Record<LeadSourceChannel, number> = {
  google_ads:       1.5,
  meta_facebook:    1.2,
  meta_instagram:   1.0,
  website_form:     0.9,
  marketplace_form: 1.0,
  webhook:          1.0,
  manual:           0.8,
  scraped:          0.5,
};

const BUDGET_BASE_CENTS: Record<BudgetTier, number> = {
  under_5k:  1500,
  "5k_15k":  2500,
  "15k_50k": 5000,
  over_50k:  10000,
  unsure:    2500,
};

export interface NormalizedLead {
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  zip: string | null;
  service_type: string;
  budget: BudgetTier;
  timeline: TimelineTier;
  notes: string | null;
  source_channel: LeadSourceChannel;
  external_id?: string | null;
  raw_payload?: Record<string, unknown> | null;
}

const VALID_BUDGETS = new Set<BudgetTier>(["under_5k", "5k_15k", "15k_50k", "over_50k", "unsure"]);
const VALID_TIMELINES = new Set<TimelineTier>(["asap", "one_to_three_months", "three_to_six_months", "flexible"]);

export function coerceBudget(v: unknown): BudgetTier {
  return typeof v === "string" && VALID_BUDGETS.has(v as BudgetTier) ? (v as BudgetTier) : "unsure";
}
export function coerceTimeline(v: unknown): TimelineTier {
  return typeof v === "string" && VALID_TIMELINES.has(v as TimelineTier)
    ? (v as TimelineTier) : "flexible";
}

const SCORE_SYSTEM = `You score homeowner project inquiries for contractor lead marketplaces.
Return a JSON object with exactly two keys, no prose, no markdown:
- "score" — integer 0-100 (intent / urgency / budget clarity / contact completeness)
- "summary" — one short sentence (≤120 chars) summarizing the opportunity`;

function stripFences(s: string) {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
}

async function scoreLead(lead: NormalizedLead): Promise<{ score: number; summary: string | null }> {
  try {
    const userPrompt = `Service: ${lead.service_type}
Budget: ${BUDGET_LABELS[lead.budget]}
Timeline: ${TIMELINE_LABELS[lead.timeline]}
Notes: ${lead.notes ?? "(none)"}
Source: ${SOURCE_CHANNEL_LABELS[lead.source_channel]}
Has phone: ${Boolean(lead.phone)}
Has email: ${Boolean(lead.email)}
ZIP: ${lead.zip ?? "(missing)"}`;
    const raw = await generateText({ system: SCORE_SYSTEM, user: userPrompt, maxTokens: 200 });
    const parsed = JSON.parse(stripFences(raw));
    return {
      score: Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 50)))),
      summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 200) : null,
    };
  } catch {
    return { score: 50, summary: null };
  }
}

export async function insertMarketplaceLead(
  admin: SupabaseClient,
  lead: NormalizedLead,
): Promise<
  | { ok: true; id: string; deduped: false }
  | { ok: true; id: string; deduped: true }
  | { ok: false; error: string }
> {
  // Dedupe — if the source already sent this external_id, no-op.
  if (lead.external_id) {
    const { data: existing } = await admin
      .from("marketplace_leads")
      .select("id")
      .eq("source_channel", lead.source_channel)
      .eq("external_id", lead.external_id)
      .maybeSingle();
    if (existing) return { ok: true, id: existing.id, deduped: true };
  }

  const { score, summary } = await scoreLead(lead);
  const base = BUDGET_BASE_CENTS[lead.budget];
  const intentMult = 0.6 + (score / 100) * 1.2;
  const sourceMult = SOURCE_PRICE_MULTIPLIER[lead.source_channel];
  const price_cents = Math.max(500, Math.round(base * intentMult * sourceMult));

  const { data, error } = await admin
    .from("marketplace_leads")
    .insert({
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      city: lead.city,
      zip: lead.zip,
      service_type: lead.service_type,
      budget: lead.budget,
      timeline: lead.timeline,
      notes: lead.notes,
      ai_score: score,
      ai_summary: summary,
      price_cents,
      source_channel: lead.source_channel,
      external_id: lead.external_id ?? null,
      raw_payload: lead.raw_payload ?? null,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Insert failed" };
  return { ok: true, id: data.id, deduped: false };
}
