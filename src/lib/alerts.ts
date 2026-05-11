// Speed-to-lead alerts: ping the contractor's chosen webhook the moment a
// new lead lands. Fast = wins. Industry studies show <5min response = ~100x
// higher conversion than >24hr.
//
// Accepts a Slack/Discord-compatible incoming webhook URL or anything else
// that takes a POST with a JSON body. We never block lead creation on this —
// failures are logged and swallowed.

import type { SupabaseClient } from "@supabase/supabase-js";
import { sendPush, type PushSubscriptionRow } from "@/lib/push";
import { sendEmail, sendSms } from "@/lib/messaging";

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
    .select("alert_webhook_url,alert_phone,email,business_name,notify_email,notify_sms,notify_push,notify_webhook")
    .eq("id", contractorId)
    .single();
  const profile = data as {
    alert_webhook_url: string | null;
    alert_phone: string | null;
    email: string | null;
    business_name: string | null;
    notify_email: boolean | null;
    notify_sms: boolean | null;
    notify_push: boolean | null;
    notify_webhook: boolean | null;
  } | null;
  if (!profile) return;

  // Default to ON when the column is null — keeps existing behavior.
  const wantWebhook = profile.notify_webhook ?? true;
  const wantPush    = profile.notify_push    ?? true;
  const wantEmail   = profile.notify_email   ?? true;
  const wantSms     = profile.notify_sms     ?? false;

  // 1. Slack/Discord/generic webhook
  if (wantWebhook && profile.alert_webhook_url) {
    await sendLeadAlert(profile.alert_webhook_url, payload);
  }

  // 2. Browser push to every registered device for this contractor
  if (wantPush) {
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
        await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }
  }

  // 3. Email — sent to the contractor's signup email via Resend
  if (wantEmail && profile.email) {
    const business = profile.business_name ?? "ContractorFlow";
    const subject = `🔔 New lead: ${payload.title}`;
    const linkLine = payload.link ? `\n\nOpen it: ${payload.link}\n` : "";
    const body =
`A new lead just hit your pipeline.

${payload.title}
${payload.body}
${payload.service ? `Service: ${payload.service}\n` : ""}${payload.city ? `City: ${payload.city}\n` : ""}${payload.source ? `Source: ${payload.source}\n` : ""}${linkLine}
Reply to this lead within 5 minutes for best close rate.

— ${business} via ContractorFlow`;
    await sendEmail(profile.email, subject, body, business);
  }

  // 4. SMS to the contractor's alert_phone (via Twilio if configured)
  if (wantSms && profile.alert_phone) {
    await sendSms(profile.alert_phone, `New lead: ${payload.title} — ${payload.body}${payload.link ? `\n${payload.link}` : ""}`);
  }
}
