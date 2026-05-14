import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scheduleLeadFollowUps } from "@/lib/follow-up-sequence";
import { alertContractorOnLead } from "@/lib/alerts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const slotId = typeof body?.slot_id === "string" ? body.slot_id : "";
  const contractorId = typeof body?.contractor_id === "string" ? body.contractor_id : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!slotId || !contractorId || !name) {
    return NextResponse.json({ error: "Missing slot_id, contractor_id, or name" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Atomic claim of the slot.
  const { data: slot, error } = await admin
    .from("booking_slots")
    .update({
      booked_at: new Date().toISOString(),
      customer_name: name,
      customer_phone: typeof body?.phone === "string" ? body.phone || null : null,
      customer_email: typeof body?.email === "string" ? body.email || null : null,
      service_type:   typeof body?.service === "string" ? body.service || null : null,
      notes:          typeof body?.notes === "string" ? body.notes || null : null,
    })
    .eq("id", slotId)
    .eq("user_id", contractorId)
    .is("booked_at", null)
    .select("*").single();
  if (error || !slot) {
    return NextResponse.json({ error: "That slot was just booked by someone else." }, { status: 409 });
  }

  // Create a lead in the contractor's pipeline.
  const { data: lead } = await admin.from("leads").insert({
    user_id: contractorId,
    name,
    phone: slot.customer_phone,
    email: slot.customer_email,
    service_type: slot.service_type ?? "Estimate visit",
    source: "Booking",
    status: "new",
    notes: `Booked estimate visit on ${new Date(slot.start_at).toLocaleString()}.\n\n${slot.notes ?? ""}`,
  }).select("id").single();

  // Calendar reminder
  if (lead) {
    await admin.from("follow_ups").insert({
      user_id: contractorId,
      lead_id: lead.id,
      title: `Estimate visit — ${name}`,
      notes: slot.service_type ?? null,
      due_at: slot.start_at,
    });
    await scheduleLeadFollowUps(admin, {
      userId: contractorId, leadId: lead.id, leadName: name,
    });
    await alertContractorOnLead(admin, contractorId, {
      title: name,
      body: `Booked estimate visit · ${new Date(slot.start_at).toLocaleString()}`,
      source: "Booking",
    });
  }

  return NextResponse.json({ ok: true });
}
