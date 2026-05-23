// Outreach drivers + AI-personalized message generation. Wraps the existing
// shared messaging.ts helpers; logs every send to cf_launchpad_outreach_log.

import { generateText } from "@/lib/ai";
import { sendEmail, sendSms, isTestMode } from "@/lib/messaging";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Channel, Prospect } from "./types";
import { extractJson } from "./scanner";

export interface PersonalizedMessage {
  subject: string | null;   // null for SMS
  body: string;
}

interface PersonalizeInput {
  prospect: Prospect;
  scanSummary: string | null;
  weaknesses: string[];
  previewUrl: string;
  channel: Channel;
  campaignTemplate?: { subject?: string | null; body: string } | null;
}

const SMS_MAX = 320;

export async function personalize(input: PersonalizeInput): Promise<PersonalizedMessage> {
  // If a campaign template is supplied, do simple Mustache substitution and skip AI.
  if (input.campaignTemplate) {
    return renderTemplate(input);
  }
  return aiPersonalize(input);
}

function renderTemplate(input: PersonalizeInput): PersonalizedMessage {
  const vars: Record<string, string> = {
    business_name: input.prospect.business_name,
    first_name: extractFirstName(input.prospect.business_name),
    city: input.prospect.city ?? "your area",
    category: input.prospect.category ?? "your business",
    preview_url: input.previewUrl,
  };
  const subst = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
  return {
    subject: input.channel === "email" ? subst(input.campaignTemplate?.subject ?? "") || null : null,
    body: subst(input.campaignTemplate!.body),
  };
}

async function aiPersonalize(input: PersonalizeInput): Promise<PersonalizedMessage> {
  const { prospect: p, channel, previewUrl, scanSummary, weaknesses } = input;
  const system = channel === "email"
    ? "You write short, casual, hyper-personal cold emails on behalf of Davi at " +
      "Contractor Flow Launchpad — an agency that builds websites and runs ads for " +
      "home-services contractors. Davi runs two contracting businesses himself, so " +
      "the voice is one contractor helping another, not a typical agency pitch. " +
      "No 'I hope this finds you well'. No bullet lists. 60-90 words max. Sign off " +
      "as Davi. Output JSON only."
    : "You write short, friendly text messages on behalf of Davi at Contractor Flow " +
      "Launchpad. Tone: helpful neighbor, not pushy salesperson. 280 chars max. " +
      "Output JSON only.";

  const user = `Write a ${channel === "email" ? "cold email" : "SMS"} for this business.

BUSINESS: ${p.business_name}
TRADE: ${p.category ?? "local service"}
CITY: ${p.city ?? "(unknown)"}
SCAN_SUMMARY: ${scanSummary ?? "(none)"}
TOP_WEAKNESS: ${weaknesses[0] ?? "(none)"}
PREVIEW_URL: ${previewUrl}

Mention ONE specific observation from the scan (not generic).
End with the preview URL so they can click and see what we built.
${channel === "email" ? "Subject: under 50 chars, intriguing, not spammy." : ""}

Return ONLY this JSON:
${channel === "email"
  ? `{ "subject": "...", "body": "..." }`
  : `{ "body": "..." }`}`;

  try {
    const raw = await generateText({ system, user, maxTokens: 600 });
    const json = extractJson(raw);
    const parsed = JSON.parse(json) as { subject?: string; body?: string };
    const body = (parsed.body ?? "").trim();
    return {
      subject: channel === "email" ? (parsed.subject ?? "").trim() || null : null,
      body: channel === "sms" ? body.slice(0, SMS_MAX) : body,
    };
  } catch {
    return fallback(input);
  }
}

function fallback(input: PersonalizeInput): PersonalizedMessage {
  const { prospect: p, previewUrl, channel } = input;
  const body = channel === "email"
    ? `Hi ${extractFirstName(p.business_name)},\n\nI built ${p.business_name} a quick mock website + ad plan based on your current presence in ${p.city ?? "your area"}. Free to look — no signup:\n\n${previewUrl}\n\nIf any of it lands, happy to talk. If not, no hard feelings.\n\n— Davi\nContractor Flow Launchpad`
    : `Hey ${p.business_name} — Davi from Contractor Flow here. Built you a quick personalized site preview: ${previewUrl}. No signup, free to check. Reply STOP to opt out.`;
  return {
    subject: channel === "email" ? `${p.business_name} — quick mockup` : null,
    body,
  };
}

function extractFirstName(business: string): string {
  // Best-effort: take leading word if it looks like a proper name; else "there".
  const first = business.split(/[\s&,]/)[0];
  if (/^[A-Z][a-z]{2,}$/.test(first)) return first;
  return "there";
}

// ---------- Send + log ----------

export interface SendOutreachOptions {
  prospect: Prospect;
  channel: Channel;
  previewUrl: string;
  campaignId?: string | null;
  scanSummary?: string | null;
  weaknesses?: string[];
  campaignTemplate?: { subject?: string | null; body: string } | null;
}

export async function sendOutreach(opts: SendOutreachOptions) {
  const supabase = createAdminClient();
  const { prospect: p, channel } = opts;

  if (p.do_not_contact) {
    return { ok: false, error: "do_not_contact" };
  }
  const to = channel === "email" ? p.email : p.phone;
  if (!to) {
    return { ok: false, error: `No ${channel} address on prospect` };
  }

  const msg = await personalize({
    prospect: p,
    scanSummary: opts.scanSummary ?? null,
    weaknesses: opts.weaknesses ?? [],
    previewUrl: opts.previewUrl,
    channel,
    campaignTemplate: opts.campaignTemplate ?? null,
  });

  // Reserve log row first so we always have a record even if send fails.
  const { data: logRow, error: logErr } = await supabase
    .from("cf_launchpad_outreach_log")
    .insert({
      prospect_id: p.id,
      campaign_id: opts.campaignId ?? null,
      channel,
      to_address: to,
      subject: msg.subject,
      body: msg.body,
      status: "queued",
      test_mode: isTestMode(),
    })
    .select("id")
    .single();
  if (logErr) {
    return { ok: false, error: `log insert: ${logErr.message}` };
  }

  const send = channel === "email"
    ? await sendEmail(to, msg.subject ?? `Quick mockup for ${p.business_name}`, msg.body, "Davi at Contractor Flow Launchpad")
    : await sendSms(to, msg.body);

  await supabase
    .from("cf_launchpad_outreach_log")
    .update({
      status: send.ok ? "sent" : "failed",
      provider_id: send.id ?? null,
      error: send.error ?? null,
      sent_at: send.ok ? new Date().toISOString() : null,
    })
    .eq("id", logRow.id);

  if (send.ok) {
    await supabase
      .from("cf_launchpad_prospects")
      .update({
        outreach_status: "sent",
        outreach_last_sent_at: new Date().toISOString(),
      })
      .eq("id", p.id);
  }

  return { ok: send.ok, error: send.error, logId: logRow.id };
}
