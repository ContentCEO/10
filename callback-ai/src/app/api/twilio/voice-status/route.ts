import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  findBusinessByTwilioNumber,
  findOrCreateLead,
  loadConversation,
  notify,
  recordMessage
} from "@/lib/leads";
import { isMissedCall, sendSms, validateTwilioSignature } from "@/lib/twilio";
import { generateSmsReply } from "@/lib/ai";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twilio call status callback. Configure on the Twilio number's voice settings:
 *   Status callback URL: https://<your-domain>/api/twilio/voice-status
 *   Events: completed (covers no-answer, busy, failed, completed)
 *
 * When a call ends without being answered, we send the AI-generated follow-up SMS.
 */
export async function POST(req: NextRequest) {
  const params = await readForm(req);
  const url = `${env.SITE_URL}/api/twilio/voice-status`;

  if (
    !validateTwilioSignature({
      signature: req.headers.get("x-twilio-signature"),
      url,
      params
    })
  ) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const callSid = params.CallSid;
  const callStatus = params.CallStatus;
  const fromNumber = params.From;
  const toNumber = params.To;
  const callDuration = parseInt(params.CallDuration ?? "0", 10) || 0;

  const db = createSupabaseServiceClient();
  const business = await findBusinessByTwilioNumber(db, toNumber);

  // Always record the call, even for unknown numbers (helps debugging).
  if (!business) {
    console.warn(`[voice-status] no business for to=${toNumber} sid=${callSid}`);
    return NextResponse.json({ ok: true, skipped: "unknown_business" });
  }

  const lead = await findOrCreateLead(db, {
    businessId: business.id,
    phone: fromNumber,
    source: "missed_call"
  });

  const missed = isMissedCall(callStatus) || (callStatus === "completed" && callDuration < 5);

  await db.from("calls").upsert(
    {
      business_id: business.id,
      lead_id: lead.id,
      twilio_call_sid: callSid,
      from_number: fromNumber,
      to_number: toNumber,
      status: callStatus,
      duration_sec: callDuration,
      was_missed: missed
    },
    { onConflict: "twilio_call_sid" }
  );

  if (!missed) {
    return NextResponse.json({ ok: true, missed: false });
  }

  // Avoid double-texting: if we already sent an outbound SMS to this lead in the
  // last 30s (e.g. duplicate webhook), skip.
  const since = new Date(Date.now() - 30_000).toISOString();
  const { count } = await db
    .from("messages")
    .select("id", { head: true, count: "exact" })
    .eq("lead_id", lead.id)
    .eq("direction", "outbound")
    .gte("created_at", since);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  await notify(db, {
    businessId: business.id,
    kind: "missed_call",
    title: `Missed call from ${fromNumber}`,
    leadId: lead.id
  });

  const history = await loadConversation(db, lead.id);
  const reply = await generateSmsReply(business, history);

  try {
    const sent = await sendSms({
      to: fromNumber,
      body: reply,
      from: business.twilio_number ?? undefined
    });
    await recordMessage(db, {
      businessId: business.id,
      leadId: lead.id,
      direction: "outbound",
      body: reply,
      twilioSid: sent.sid,
      aiGenerated: true,
      status: "sent"
    });
    await db.from("leads").update({ status: "contacted" }).eq("id", lead.id);
  } catch (err) {
    console.error("[voice-status] sendSms failed:", err);
    await recordMessage(db, {
      businessId: business.id,
      leadId: lead.id,
      direction: "outbound",
      body: reply,
      aiGenerated: true,
      status: "failed"
    });
    return NextResponse.json({ ok: false, error: "send_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sent: true });
}

async function readForm(req: NextRequest): Promise<Record<string, string>> {
  const text = await req.text();
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(text)) out[k] = v;
  return out;
}
