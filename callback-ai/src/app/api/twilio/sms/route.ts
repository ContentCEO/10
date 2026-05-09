import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import {
  findBusinessByTwilioNumber,
  findOrCreateLead,
  loadConversation,
  notify,
  recordMessage
} from "@/lib/leads";
import { validateTwilioSignature } from "@/lib/twilio";
import { generateSmsReply } from "@/lib/ai";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twilio inbound SMS webhook. Configure on the Twilio number's "A MESSAGE COMES IN":
 *   https://<your-domain>/api/twilio/sms
 *
 * We respond with TwiML containing the AI-generated reply so Twilio sends it
 * back over the same MMS/SMS channel. We also persist both directions.
 */
export async function POST(req: NextRequest) {
  const params = await readForm(req);
  const url = `${env.SITE_URL}/api/twilio/sms`;

  if (
    !validateTwilioSignature({
      signature: req.headers.get("x-twilio-signature"),
      url,
      params
    })
  ) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const fromNumber = params.From;
  const toNumber = params.To;
  const body = (params.Body ?? "").trim();
  const messageSid = params.MessageSid ?? params.SmsMessageSid;

  const db = createSupabaseServiceClient();
  const business = await findBusinessByTwilioNumber(db, toNumber);

  const twiml = new twilio.twiml.MessagingResponse();

  if (!business) {
    console.warn(`[sms] no business for to=${toNumber}`);
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" }
    });
  }

  const lead = await findOrCreateLead(db, {
    businessId: business.id,
    phone: fromNumber,
    source: "sms"
  });

  // STOP/HELP compliance
  const upper = body.toUpperCase();
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(upper)) {
    await db.from("leads").update({ status: "lost" }).eq("id", lead.id);
    await recordMessage(db, {
      businessId: business.id,
      leadId: lead.id,
      direction: "inbound",
      body,
      twilioSid: messageSid,
      status: "received"
    });
    // Twilio handles the STOP confirmation message automatically.
    return new NextResponse(twiml.toString(), {
      status: 200,
      headers: { "Content-Type": "text/xml" }
    });
  }

  await recordMessage(db, {
    businessId: business.id,
    leadId: lead.id,
    direction: "inbound",
    body,
    twilioSid: messageSid,
    status: "received"
  });

  await notify(db, {
    businessId: business.id,
    kind: "lead_reply",
    title: `New reply from ${fromNumber}`,
    body: body.length > 160 ? body.slice(0, 160) + "…" : body,
    leadId: lead.id
  });

  if (lead.status === "new") {
    await db.from("leads").update({ status: "qualifying" }).eq("id", lead.id);
  }

  const history = await loadConversation(db, lead.id);
  const reply = await generateSmsReply(business, history);

  twiml.message(reply);

  // Persist the outbound message we're about to send via TwiML.
  await recordMessage(db, {
    businessId: business.id,
    leadId: lead.id,
    direction: "outbound",
    body: reply,
    aiGenerated: true,
    status: "sent"
  });

  // Heuristic: if the AI sent a booking link, mark the lead as booked.
  if (business.booking_url && reply.includes(business.booking_url)) {
    await db.from("leads").update({ status: "booked" }).eq("id", lead.id);
  }

  return new NextResponse(twiml.toString(), {
    status: 200,
    headers: { "Content-Type": "text/xml" }
  });
}

async function readForm(req: NextRequest): Promise<Record<string, string>> {
  const text = await req.text();
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(text)) out[k] = v;
  return out;
}
