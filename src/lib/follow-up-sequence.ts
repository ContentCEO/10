import type { SupabaseClient } from "@supabase/supabase-js";

// Auto-scheduled follow-up cadence for every new lead. Tuned to the
// industry rule of thumb: respond within a day, push for the meeting in
// 72 hours, last shot inside two weeks before the lead goes cold.
const STEPS: { offsetDays: number; title: string; notes: string }[] = [
  { offsetDays: 1,  title: "Touch base with new lead",
    notes: "Quick text/call: thanks for the inquiry, confirm scope, schedule estimate." },
  { offsetDays: 3,  title: "Send estimate or confirm next step",
    notes: "If you've toured the project, send the estimate. Otherwise nail down a time." },
  { offsetDays: 7,  title: "Follow up — still interested?",
    notes: "Friendly nudge with any FAQs the customer might have on the estimate." },
  { offsetDays: 14, title: "Final follow-up before going cold",
    notes: "Last shot: 'closing this out unless I hear back'. Keep the door open." },
];

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  // schedule for 9am local-ish to keep them visible in the day's view
  d.setHours(9, 0, 0, 0);
  return d;
}

export async function scheduleLeadFollowUps(
  supabase: SupabaseClient,
  args: { userId: string; leadId: string; leadName: string; startFrom?: Date },
) {
  const start = args.startFrom ?? new Date();
  const rows = STEPS.map((s) => ({
    user_id: args.userId,
    lead_id: args.leadId,
    title: `${s.title} — ${args.leadName}`,
    notes: s.notes,
    due_at: addDays(start, s.offsetDays).toISOString(),
  }));
  // Best-effort — never block lead creation if reminders fail to write.
  await supabase.from("follow_ups").insert(rows);
}
