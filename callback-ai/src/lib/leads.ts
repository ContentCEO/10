import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone } from "@/lib/phone";

export async function findOrCreateLead(
  db: SupabaseClient,
  args: { businessId: string; phone: string; source?: string }
) {
  const phone = normalizePhone(args.phone);

  const { data: existing } = await db
    .from("leads")
    .select("*")
    .eq("business_id", args.businessId)
    .eq("phone", phone)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await db
    .from("leads")
    .insert({
      business_id: args.businessId,
      phone,
      source: args.source ?? "missed_call",
      status: "new"
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function recordMessage(
  db: SupabaseClient,
  args: {
    businessId: string;
    leadId: string;
    direction: "inbound" | "outbound";
    body: string;
    twilioSid?: string;
    aiGenerated?: boolean;
    status?: string;
  }
) {
  const { error } = await db.from("messages").insert({
    business_id: args.businessId,
    lead_id: args.leadId,
    direction: args.direction,
    body: args.body,
    twilio_sid: args.twilioSid,
    ai_generated: args.aiGenerated ?? false,
    status: args.status ?? (args.direction === "inbound" ? "received" : "sent")
  });
  if (error) throw error;

  await db
    .from("leads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", args.leadId);
}

export async function loadConversation(
  db: SupabaseClient,
  leadId: string,
  limit = 20
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const { data } = await db
    .from("messages")
    .select("direction,body,created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const ordered = (data ?? []).slice().reverse();
  return ordered.map((m) => ({
    role: m.direction === "inbound" ? "user" : "assistant",
    content: m.body as string
  }));
}

export async function findBusinessByTwilioNumber(
  db: SupabaseClient,
  twilioNumber: string
) {
  const { data, error } = await db
    .from("businesses")
    .select("*")
    .eq("twilio_number", twilioNumber)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function notify(
  db: SupabaseClient,
  args: {
    businessId: string;
    kind: "missed_call" | "lead_reply" | "appointment_booked";
    title: string;
    body?: string;
    leadId?: string;
  }
) {
  await db.from("notifications").insert({
    business_id: args.businessId,
    kind: args.kind,
    title: args.title,
    body: args.body,
    lead_id: args.leadId
  });
}
