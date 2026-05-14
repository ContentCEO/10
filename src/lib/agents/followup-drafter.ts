import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentActionLog } from "@/app/api/agents/tick/route";

/*
 * Follow-Up Drafter.
 *
 * When a contractor claims a marketplace lead (lead.bought_by set, recently),
 * draft a personalized first-touch SMS and email. Queue for owner approval
 * before send (initially); after enough good drafts, the owner can flip
 * the auto-send flag in config.
 *
 * Inference today is template-based + light personalization. Swap in a
 * Claude call later for higher-quality drafts.
 */

interface Config {
  channels?: ("sms" | "email")[];
  auto_send?: boolean;
  lookback_minutes?: number;
}

interface ClaimedLead {
  id: string;
  name: string | null;
  service_type: string | null;
  city: string | null;
  notes: string | null;
  bought_by: string | null;
  buyer_id: string | null;
  bought_at: string | null;
}

interface Profile {
  id: string;
  business_name: string | null;
  preferences: { ai_tone?: "formal" | "friendly" | "casual" | "direct" } | null;
}

const TONE_STYLES = {
  friendly: { open: "Hey", close: "Talk soon," },
  casual:   { open: "Hi",  close: "Cheers,"   },
  formal:   { open: "Hello,", close: "Best regards," },
  direct:   { open: "Hi",  close: "Thanks,"   },
} as const;

function draftSms(lead: ClaimedLead, business: string, tone: keyof typeof TONE_STYLES): string {
  const t = TONE_STYLES[tone];
  const name = lead.name?.split(" ")[0] ?? "there";
  const svc = lead.service_type ?? "your project";
  const city = lead.city ? ` in ${lead.city}` : "";
  return `${t.open} ${name} — ${business} here. Saw your inquiry about ${svc}${city}. Got 10 min for a quick chat or can I send a same-day quote? – ${t.close}`;
}

function draftEmail(lead: ClaimedLead, business: string, tone: keyof typeof TONE_STYLES): { subject: string; body: string } {
  const t = TONE_STYLES[tone];
  const name = lead.name?.split(" ")[0] ?? "there";
  const svc = lead.service_type ?? "your project";
  const city = lead.city ? ` in ${lead.city}` : "";
  return {
    subject: `${svc} quote — ${business}`,
    body:
`${t.open} ${name},

I'm ${business}. We picked up your inquiry about ${svc}${city} from the ContractorFlow marketplace.

A few quick questions so I can put a real number together for you:
  1. What's your ideal start window?
  2. Anything we should know about access or scope?
  3. Best phone number for a 5-min call?

Happy to come out for a free on-site or send pricing same-day from photos.

${t.close}
${business}`
  };
}

export async function runFollowupDrafter(config: Config): Promise<AgentActionLog[]> {
  const lookbackMin = Number(config.lookback_minutes ?? 120);
  const channels = (config.channels ?? ["sms", "email"]) as ("sms" | "email")[];
  const admin = createAdminClient();

  const since = new Date(Date.now() - lookbackMin * 60_000).toISOString();
  const { data: claimed } = await admin
    .from("marketplace_leads")
    .select("id,name,service_type,city,notes,bought_by,buyer_id,bought_at")
    .not("bought_by", "is", null)
    .gte("bought_at", since)
    .limit(50);

  const actions: AgentActionLog[] = [];

  for (const l of (claimed ?? []) as ClaimedLead[]) {
    // Skip if we've already drafted for this lead.
    const { count: existing } = await admin
      .from("agent_actions").select("id", { count: "exact", head: true })
      .eq("agent_slug", "followup-drafter")
      .eq("action_type", "drafted_followup")
      .eq("target_id", l.id);
    if ((existing ?? 0) > 0) continue;

    // Pull buyer's business name + tone preference.
    const buyerId = l.buyer_id ?? l.bought_by;
    if (!buyerId) continue;
    const { data: profile } = await admin
      .from("profiles")
      .select("id,business_name,preferences")
      .eq("id", buyerId)
      .maybeSingle() as { data: Profile | null };
    const business = profile?.business_name ?? "your contractor";
    const tone = (profile?.preferences?.ai_tone ?? "friendly") as keyof typeof TONE_STYLES;

    const drafts: Record<string, unknown> = {};
    if (channels.includes("sms"))   drafts.sms   = draftSms(l, business, tone);
    if (channels.includes("email")) drafts.email = draftEmail(l, business, tone);

    actions.push({
      action_type: "drafted_followup",
      target_table: "marketplace_leads",
      target_id: l.id,
      summary: `Drafted follow-up · ${l.service_type ?? "?"} · ${business} → ${l.name ?? "(unknown)"}`,
      details: { drafts, buyer_id: buyerId, tone },
      requires_approval: !config.auto_send,
    });
  }

  return actions;
}
