import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentActionLog } from "@/app/api/agents/tick/route";

/*
 * Subscription Win-Back.
 *
 * Protects MRR by catching at-risk ContractorFlow subscriptions before they
 * churn for good, and re-engaging the ones that already lapsed. Scans
 * cf_subscriptions for three signals:
 *
 *   1. trialing  — trial ends within `trial_warn_days`. Draft a "your trial's
 *      almost up, here's what you'd lose" nudge.
 *   2. past_due  — a payment failed. Draft an urgent "update your card to keep
 *      access" note (fastest recovery — they already want the product).
 *   3. canceled  — ended within the last `winback_grace_days`. Draft a warm
 *      win-back offer.
 *
 * Each draft (SMS + email) is queued for owner approval before send.
 * Idempotent — skips any subscription already drafted within
 * `redraft_cooldown_days`.
 */

interface Config {
  trial_warn_days?: number;
  winback_grace_days?: number;
  redraft_cooldown_days?: number;
}

type SubStatus = "trialing" | "past_due" | "canceled";

interface SubscriptionRow {
  id: string;
  user_id: string;
  sub_brand: string;
  tier: string | null;
  status: SubStatus;
  current_period_end: string | null;
  ends_at: string | null;
}

interface Profile {
  email: string | null;
  business_name: string | null;
}

const MODULE_LABEL: Record<string, string> = {
  "cf-crm": "CRM",
  "cf-launchpad": "Launchpad",
  "cf-marketplace": "Marketplace",
  "cf-academy": "Academy",
  "cf-capital": "Capital",
};

function daysBetween(from: number, toIso: string | null): number | null {
  if (!toIso) return null;
  return Math.round((new Date(toIso).getTime() - from) / (24 * 60 * 60 * 1000));
}

interface Draft {
  reason: string;            // short tag for the summary line
  action_type: string;
  sms: string;
  email: { subject: string; body: string };
}

function buildDraft(sub: SubscriptionRow, mod: string, now: number): Draft | null {
  switch (sub.status) {
    case "trialing": {
      const left = daysBetween(now, sub.current_period_end);
      const when = left === null ? "soon" : left <= 1 ? "tomorrow" : `in ${left} days`;
      return {
        reason: `trial ends ${when}`,
        action_type: "drafted_trial_nudge",
        sms: `Hey — your ContractorFlow ${mod} trial ends ${when}. Don't lose your pipeline, leads, and AI drafts. Keep your account: contractorflowstore.com/billing`,
        email: {
          subject: `Your ${mod} trial ends ${when}`,
          body: `Hi,\n\nQuick heads up — your ContractorFlow ${mod} trial ends ${when}.\n\nWhen it does you'll lose access to your pipeline, saved leads, and the AI tools that draft your follow-ups and proposals. Keeping your account takes 30 seconds:\n\ncontractorflowstore.com/billing\n\nOn the fence? Just reply and tell me what's missing — I read every email myself.\n\n— Davi\nFounder, ContractorFlow`,
        },
      };
    }
    case "past_due": {
      return {
        reason: "payment failed",
        action_type: "drafted_payment_recovery",
        sms: `Hey — your ContractorFlow ${mod} payment didn't go through, so your account's on hold. Update your card to restore access: contractorflowstore.com/billing`,
        email: {
          subject: `Action needed · your ${mod} payment failed`,
          body: `Hi,\n\nYour latest ContractorFlow ${mod} payment didn't go through, so your account is temporarily on hold.\n\nIt's usually just an expired card. Updating it restores everything instantly:\n\ncontractorflowstore.com/billing\n\nIf the timing's tight this month, reply and we'll work something out — I'd rather keep you than lose you over a card.\n\n— Davi\nFounder, ContractorFlow`,
        },
      };
    }
    case "canceled": {
      return {
        reason: "recently canceled",
        action_type: "drafted_winback_offer",
        sms: `Hey — saw you canceled ContractorFlow ${mod}. Mind sharing what didn't click? If you come back this month I'll knock 30% off your first 3 months: contractorflowstore.com/billing`,
        email: {
          subject: `Before you go for good — ${mod}`,
          body: `Hi,\n\nI noticed you canceled ContractorFlow ${mod}. No hard feelings — but I'd genuinely love to know what didn't click. One line back helps me fix it.\n\nAnd if it was timing or price: come back this month and I'll take 30% off your first 3 months. Your data is still here, exactly where you left it.\n\ncontractorflowstore.com/billing\n\n— Davi\nFounder, ContractorFlow`,
        },
      };
    }
    default:
      return null;
  }
}

export async function runSubscriptionWinback(config: Config): Promise<AgentActionLog[]> {
  const trialWarnDays = Number(config.trial_warn_days ?? 3);
  const graceDays = Number(config.winback_grace_days ?? 30);
  const cooldownDays = Number(config.redraft_cooldown_days ?? 14);

  const admin = createAdminClient();
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const trialCutoff = new Date(now + trialWarnDays * 24 * 60 * 60 * 1000).toISOString();
  const graceCutoff = new Date(now - graceDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: subs } = await admin
    .from("cf_subscriptions")
    .select("id,user_id,sub_brand,tier,status,current_period_end,ends_at")
    .in("status", ["trialing", "past_due", "canceled"])
    .limit(200);

  const actions: AgentActionLog[] = [];

  for (const sub of (subs ?? []) as SubscriptionRow[]) {
    // Only act when the timing window matches the status.
    if (sub.status === "trialing") {
      // Must end within the warning window and not already be over.
      if (!sub.current_period_end) continue;
      if (sub.current_period_end > trialCutoff || sub.current_period_end < nowIso) continue;
    } else if (sub.status === "canceled") {
      // Only re-engage recent cancels — stale ones are noise.
      const ended = sub.ends_at ?? sub.current_period_end;
      if (!ended || ended < graceCutoff) continue;
    }
    // past_due: always actionable — a failed payment is urgent regardless of dates.

    // Idempotency: skip if we drafted for this subscription within the cooldown.
    const { count: existing } = await admin
      .from("agent_actions").select("id", { count: "exact", head: true })
      .eq("agent_slug", "subscription-winback")
      .eq("target_id", sub.id)
      .gte("created_at", new Date(now - cooldownDays * 24 * 60 * 60 * 1000).toISOString());
    if ((existing ?? 0) > 0) continue;

    const mod = MODULE_LABEL[sub.sub_brand] ?? "subscription";
    const draft = buildDraft(sub, mod, now);
    if (!draft) continue;

    const { data: profile } = await admin
      .from("profiles").select("email,business_name").eq("id", sub.user_id).maybeSingle() as { data: Profile | null };
    const who = profile?.business_name ?? profile?.email ?? "customer";

    actions.push({
      action_type: draft.action_type,
      target_table: "cf_subscriptions",
      target_id: sub.id,
      summary: `Win-back · ${who} · ${mod} · ${draft.reason}`,
      details: {
        sms: draft.sms,
        email: draft.email,
        status: sub.status,
        sub_brand: sub.sub_brand,
        tier: sub.tier,
        user_id: sub.user_id,
        to_email: profile?.email ?? null,
      },
      requires_approval: true,
    });
  }

  return actions;
}
