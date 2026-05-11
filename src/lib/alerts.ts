// Speed-to-lead alerts: ping the contractor's chosen webhook the moment a
// new lead lands. Fast = wins. Industry studies show <5min response = ~100x
// higher conversion than >24hr.
//
// Accepts a Slack/Discord-compatible incoming webhook URL or anything else
// that takes a POST with a JSON body. We never block lead creation on this —
// failures are logged and swallowed.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPush, type PushSubscriptionRow } from "@/lib/push";

interface AlertPayload {
  title: string;
  body: string;
  source?: string;
  service?: string;
  city?: string;
  link?: string;
}

function buildSlackPayload(p: AlertPayload) {
  return {
    text: `🔔 New lead: ${p.title}`,
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*🔔 New lead:* ${p.title}\n${p.body}` },
      },
      ...(p.link ? [{
        type: "actions",
        elements: [{ type: "button", text: { type: "plain_text", text: "Open" }, url: p.link }],
      }] : []),
    ],
  };
}

function buildDiscordPayload(p: AlertPayload) {
  return {
    content: `🔔 **New lead** — ${p.title}\n${p.body}${p.link ? `\n${p.link}` : ""}`,
  };
}

function buildGenericPayload(p: AlertPayload) {
  return {
    event: "new_lead",
    ...p,
  };
}

export async function sendLeadAlert(
  webhookUrl: string,
  payload: AlertPayload,
): Promise<void> {
  const url = webhookUrl.trim();
  if (!url) return;
  let body: unknown;
  if (url.includes("hooks.slack.com")) body = buildSlackPayload(payload);
  else if (url.includes("discord.com/api/webhooks")) body = buildDiscordPayload(payload);
  else body = buildGenericPayload(payload);
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Silent — lead creation already succeeded; alert is best-effort.
  }
}

export async function alertContractorOnLead(
  admin: SupabaseClient,
  contractorId: string,
  payload: AlertPayload,
): Promise<void> {
  const { data } = await admin
    .from("profiles")
    .select("alert_webhook_url,alert_phone")
    .eq("id", contractorId)
    .single();
  const url = (data as { alert_webhook_url: string | null } | null)?.alert_webhook_url;
  if (url) await sendLeadAlert(url, payload);

  // Push notifications to every registered device for this contractor.
  const { data: subs } = await admin
    .from("push_subscriptions").select("endpoint,p256dh,auth,id")
    .eq("user_id", contractorId);
  for (const s of ((subs ?? []) as (PushSubscriptionRow & { id: string })[])) {
    const result = await sendPush(s, {
      title: `🔔 New lead: ${payload.title}`,
      body: payload.body,
      url: payload.link ?? "/leads",
    });
    if (result.expired) {
      // Subscription dead — remove so we don't keep retrying it.
      await admin.from("push_subscriptions").delete().eq("id", s.id);
    }
  }
}
