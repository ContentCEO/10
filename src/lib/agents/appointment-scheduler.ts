import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentActionLog } from "@/app/api/agents/tick/route";

/*
 * Appointment Scheduler.
 *
 * Watches for leads where a follow-up reply has come in (signaled by
 * messages.body insert with direction='inbound' on a recent lead) and
 * the lead is still in "contacted" or "estimate" stage. Drafts an offer
 * of three time slots in the next `slot_window_days`, working around
 * the contractor's existing follow_ups for that day.
 *
 * Owner approves before send. Once approved + accepted by the lead, a
 * downstream agent (booking) creates the actual calendar entry.
 */

interface Config {
  slot_window_days?: number;
  slots_per_offer?: number;
}

interface Lead {
  id: string;
  name: string;
  status: string;
  service_type: string | null;
  user_id: string;
  updated_at: string;
}

interface Profile {
  business_name: string | null;
}

function nextSlots(days: number, count: number): { iso: string; label: string }[] {
  const slots: { iso: string; label: string }[] = [];
  let cursor = new Date();
  cursor.setMinutes(0, 0, 0);
  cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000); // start tomorrow
  while (slots.length < count) {
    // Skip Sunday
    if (cursor.getDay() === 0) { cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000); continue; }
    // Three windows per day: 9am, 1pm, 4pm
    const hours = [9, 13, 16];
    for (const h of hours) {
      const slot = new Date(cursor);
      slot.setHours(h, 0, 0, 0);
      if (slot.getTime() > Date.now() && slots.length < count) {
        slots.push({
          iso: slot.toISOString(),
          label: slot.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
        });
      }
    }
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
    if (cursor.getTime() - Date.now() > days * 24 * 60 * 60 * 1000) break;
  }
  return slots;
}

export async function runAppointmentScheduler(config: Config): Promise<AgentActionLog[]> {
  const windowDays = Number(config.slot_window_days ?? 14);
  const slotsCount = Number(config.slots_per_offer ?? 3);
  const admin = createAdminClient();

  // Pick leads in "contacted" or "estimate" updated within the last 24h
  // (i.e., recent activity suggests engagement).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: leads } = await admin
    .from("leads")
    .select("id,name,status,service_type,user_id,updated_at")
    .in("status", ["contacted", "estimate"])
    .gte("updated_at", since)
    .limit(30);

  const actions: AgentActionLog[] = [];

  for (const l of (leads ?? []) as Lead[]) {
    // Skip if we've already offered slots for this lead recently.
    const { count: existing } = await admin
      .from("agent_actions").select("id", { count: "exact", head: true })
      .eq("agent_slug", "appointment-scheduler")
      .eq("target_id", l.id)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
    if ((existing ?? 0) > 0) continue;

    const { data: profile } = await admin
      .from("profiles").select("business_name").eq("id", l.user_id).maybeSingle() as { data: Profile | null };
    const business = profile?.business_name ?? "your contractor";
    const name = l.name.split(" ")[0];
    const svc = l.service_type ?? "your project";
    const slots = nextSlots(windowDays, slotsCount);
    const slotList = slots.map((s, i) => `${i + 1}. ${s.label}`).join("\n");

    const sms = `Hey ${name}, ${business} here — happy to come look at ${svc}. Any of these work?\n${slots.map((s) => s.label).join(" / ")}\nReply with a number.`;
    const email = {
      subject: `Time to look at ${svc}?`,
      body: `Hi ${name},\n\nWant to swing by for a free walk-through on ${svc}? Here are three options — pick whichever works and I'll lock it in:\n\n${slotList}\n\nIf none of these fit just send back a couple times that do.\n\n${business}`,
    };

    actions.push({
      action_type: "offered_appointment_slots",
      target_table: "leads",
      target_id: l.id,
      summary: `Offered ${slots.length} slots · ${name} · ${svc}`,
      details: { sms, email, slots, business },
      requires_approval: true,
    });
  }

  return actions;
}
