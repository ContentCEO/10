import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Twilio inbound SMS webhook. Configure your Twilio number's "A MESSAGE
// COMES IN" webhook to POST x-www-form-urlencoded to:
//   https://YOUR-DOMAIN/api/sms/inbound
//
// We don't validate Twilio signatures here for MVP — add X-Twilio-Signature
// HMAC validation when going to production.

function normalizePhone(p: string): string {
  return p.replace(/[^0-9+]/g, "");
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  const fromRaw = String(formData.get("From") ?? "");
  const toRaw   = String(formData.get("To") ?? "");
  const body    = String(formData.get("Body") ?? "").trim();
  const sid     = String(formData.get("MessageSid") ?? "");

  if (!fromRaw || !body) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
      { headers: { "Content-Type": "text/xml" } },
    );
  }

  const from = normalizePhone(fromRaw);
  const to   = normalizePhone(toRaw);
  const admin = createAdminClient();

  // Find the contractor who owns the inbound Twilio number. We match on the
  // alert_phone field — set this on your profile to your Twilio number.
  let user_id: string | null = null;
  if (to) {
    const { data } = await admin
      .from("profiles").select("id,alert_phone")
      .ilike("alert_phone", `%${to.slice(-10)}%`).limit(1).maybeSingle();
    if (data) user_id = data.id;
  }

  // Try to match an existing lead by phone.
  let matched_lead_id: string | null = null;
  if (user_id && from) {
    const phoneTail = from.slice(-10);
    const { data: lead } = await admin
      .from("leads").select("id")
      .eq("user_id", user_id)
      .or(`phone.ilike.%${phoneTail}%,email.ilike.%${phoneTail}%`)
      .limit(1).maybeSingle();
    if (lead) matched_lead_id = lead.id;
  }

  await admin.from("inbound_messages").insert({
    user_id,
    from_phone: from,
    to_phone: to || null,
    body,
    twilio_sid: sid || null,
    matched_lead_id,
  });

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response/>`,
    { headers: { "Content-Type": "text/xml" } },
  );
}
