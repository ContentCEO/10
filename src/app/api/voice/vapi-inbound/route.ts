import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  insertMarketplaceLead,
  coerceBudget,
  coerceTimeline,
} from "@/lib/lead-intake";
import { sendSms, isTestMode } from "@/lib/messaging";
import { isQualifiedLead } from "@/lib/lead-quality";
import { classifyTrade } from "@/lib/trades";

export const runtime = "nodejs";
export const maxDuration = 60;

/*
 * Vapi voice-agent webhook. Vapi posts here when:
 *   - end-of-call-report: after the AI receptionist hangs up. Contains
 *     transcript, structured data (name, phone, project, urgency, address),
 *     and call metadata.
 *   - function-call: live during the call if Vapi needs us to do something
 *     (we don't expose any tools yet — ignore).
 *   - status-update: in-flight call state. Ignore.
 *
 * Auth: HMAC SHA-256 over the raw body, signed with VAPI_WEBHOOK_SECRET,
 * passed as the X-Vapi-Signature header. Verify before doing anything.
 *
 * On a successful end-of-call:
 *   1. Parse the structured-data + transcript out of the payload.
 *   2. Create a marketplace_lead with source_channel='webhook' (Lane A —
 *      caller voluntarily gave us their info).
 *   3. Mirror cron will pick it up within 2 min and push to /leads.
 *   4. If the lead passes the quality gate, SMS the owner immediately
 *      ("🔥 Hot voice lead: Jane Smith, kitchen remodel, ASAP, 02139").
 */

interface VapiToolCall {
  name?: string;
  arguments?: Record<string, unknown>;
}

interface VapiStructured {
  name?: string;
  caller_name?: string;
  phone?: string;
  caller_phone?: string;
  email?: string;
  project?: string;
  service_type?: string;
  service?: string;
  urgency?: string;
  timeline?: string;
  address?: string;
  city?: string;
  zip?: string;
  zip_code?: string;
  budget?: string;
}

interface VapiMessage {
  type?: string;                                // "end-of-call-report" | "function-call" | "status-update"
  call?: {
    id?: string;
    phoneNumber?: { number?: string };
    customer?: { number?: string; name?: string };
    startedAt?: string;
    endedAt?: string;
    cost?: number;
    transcript?: string;
  };
  transcript?: string;
  summary?: string;
  endedReason?: string;
  analysis?: { structuredData?: VapiStructured; summary?: string };
  toolCalls?: VapiToolCall[];
  // Some Vapi payload variants put fields at the root:
  structuredData?: VapiStructured;
}

function verifyVapiSignature(raw: string, header: string | null): boolean {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) return true; // not configured yet — accept (initial setup)
  if (!header) return false;
  // Header may be either "sha256=..." or just hex digest.
  const sig = header.startsWith("sha256=") ? header.slice(7) : header;
  const expected = createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

function normalizeUrgency(u: string | undefined | null): "asap" | "one_to_three_months" | "three_to_six_months" | "flexible" {
  const v = (u ?? "").toLowerCase();
  if (/asap|emergenc|today|tomorrow|urgent|leak|flood/.test(v)) return "asap";
  if (/this month|few weeks|soon/.test(v)) return "one_to_three_months";
  if (/few months|quarter/.test(v)) return "three_to_six_months";
  return "flexible";
}

function pickFirst(...vals: (string | undefined | null)[]): string | null {
  for (const v of vals) {
    const t = (v ?? "").trim();
    if (t) return t;
  }
  return null;
}

export async function POST(request: Request) {
  const raw = await request.text();
  const sigHeader = request.headers.get("x-vapi-signature") ?? request.headers.get("x-vapi-secret");
  if (!verifyVapiSignature(raw, sigHeader)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: unknown = null;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Vapi wraps messages in { message: {...} }; tolerate flat too.
  const msg = ((body as { message?: VapiMessage }).message ?? body) as VapiMessage;
  const eventType = msg.type ?? "unknown";

  if (eventType !== "end-of-call-report") {
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  const data = msg.analysis?.structuredData ?? msg.structuredData ?? {};
  const transcript = msg.call?.transcript ?? msg.transcript ?? "";
  const callId = msg.call?.id ?? `vapi_${Date.now().toString(36)}`;
  const summary = msg.analysis?.summary ?? msg.summary ?? "";

  const name = pickFirst(data.name, data.caller_name, msg.call?.customer?.name) ?? "Voice caller";
  const phone = pickFirst(data.phone, data.caller_phone, msg.call?.customer?.number, msg.call?.phoneNumber?.number);
  const email = pickFirst(data.email);
  const serviceType = pickFirst(data.service_type, data.service, data.project) ?? "Voice call inquiry";
  const city = pickFirst(data.city);
  const zip = pickFirst(data.zip, data.zip_code);
  const timeline = normalizeUrgency(pickFirst(data.urgency, data.timeline));
  const notes = [
    data.address ? `Address: ${data.address}` : null,
    summary ? `AI summary: ${summary}` : null,
    transcript ? `Transcript:\n${transcript.slice(0, 4000)}` : null,
  ].filter(Boolean).join("\n\n");

  const admin = createAdminClient();
  const result = await insertMarketplaceLead(admin, {
    name,
    phone,
    email,
    city,
    zip,
    service_type: serviceType.slice(0, 200),
    budget: coerceBudget(data.budget),
    timeline: coerceTimeline(timeline),
    notes,
    source_channel: "webhook",
    external_id: `vapi:${callId}`,
    raw_payload: msg as unknown as Record<string, unknown>,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
  }

  // Owner alert on hot voice leads — fast path so they can call back
  // within the 5-minute golden window.
  const quality = isQualifiedLead({
    name, phone, city, zip, notes,
    service_type: serviceType, ai_summary: summary,
  });
  let alerted = false;
  if (quality.ok) {
    const trade = classifyTrade(`${serviceType} ${notes}`);
    const ownerPhone = process.env.OWNER_PHONE;
    if (ownerPhone) {
      const text = `🔥 Voice lead: ${name} · ${trade.replace(/-/g, " ")} · ${timeline} · ${city ?? zip ?? "MA"}. ${phone ? `Call back: ${phone}` : ""}`;
      const r = await sendSms(ownerPhone, text);
      alerted = r.ok;
    }
  }

  return NextResponse.json({
    ok: true,
    lead_id: result.id,
    deduped: result.deduped,
    qualified: quality.ok,
    quality_reasons: quality.ok ? [] : quality.reasons,
    owner_alerted: alerted,
    test_mode: isTestMode(),
  });
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "POST end-of-call-report payloads here from Vapi" });
}
