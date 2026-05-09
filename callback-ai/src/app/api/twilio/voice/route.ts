import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { findBusinessByTwilioNumber, findOrCreateLead } from "@/lib/leads";
import { validateTwilioSignature } from "@/lib/twilio";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Twilio voice webhook (POST). Configure on the Twilio number's "A CALL COMES IN":
 *   https://<your-domain>/api/twilio/voice
 *
 * We respond with TwiML that tries to forward the call to the business owner's
 * phone (if configured). If unanswered, voice-status will fire and we'll send the
 * follow-up SMS from there.
 */
export async function POST(req: NextRequest) {
  const params = await readForm(req);
  const url = `${env.SITE_URL}/api/twilio/voice`;

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
  const callSid = params.CallSid;

  const db = createSupabaseServiceClient();
  const business = await findBusinessByTwilioNumber(db, toNumber);

  if (business) {
    const lead = await findOrCreateLead(db, {
      businessId: business.id,
      phone: fromNumber,
      source: "missed_call"
    });

    await db.from("calls").upsert(
      {
        business_id: business.id,
        lead_id: lead.id,
        twilio_call_sid: callSid,
        from_number: fromNumber,
        to_number: toNumber,
        status: "ringing",
        was_missed: false
      },
      { onConflict: "twilio_call_sid" }
    );
  }

  const twiml = new twilio.twiml.VoiceResponse();
  // For MVP: skip forwarding entirely and let the call go straight to the missed-call flow.
  // Businesses can wire their own forwarding later via business.forward_number etc.
  twiml.say(
    { voice: "polly.Joanna" },
    "Thanks for calling. We're not able to take your call right now, but we'll text you right back. Goodbye."
  );
  twiml.hangup();

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
