// Default drip sequence templates contractors can copy. Steps are
// processed by /api/drip/enroll which schedules follow_ups at the right
// future times. The existing daily cron then AI-drafts and sends each
// touch when its due_at fires.

export interface DripStep {
  delay_days: number;
  channel: "sms" | "email";
  prompt: string;  // shown to AI as the "what to say" context
}

export interface DripTemplate {
  name: string;
  description: string;
  steps: DripStep[];
}

export const DEFAULT_DRIP_TEMPLATES: DripTemplate[] = [
  {
    name: "Cold lead nurture (7-touch)",
    description:
      "Standard cold-lead cadence: day 1, 3, 7, 14, 30, 60, 90. Most contractors give up after 2 touches — this wins the deals everyone else misses.",
    steps: [
      { delay_days:  1, channel: "sms",   prompt: "Friendly first follow-up — 'hey, just checking if you had any questions about the estimate?'" },
      { delay_days:  3, channel: "sms",   prompt: "Soft re-engagement — share a quick before/after or testimonial relevant to their service." },
      { delay_days:  7, channel: "email", prompt: "Helpful content — a tip or guide related to their service type. No sales push." },
      { delay_days: 14, channel: "sms",   prompt: "Time-sensitive nudge — 'we have an opening next week if you still want a quote'." },
      { delay_days: 30, channel: "email", prompt: "Educational email — answer the most common objection for this service type." },
      { delay_days: 60, channel: "sms",   prompt: "Casual check-in — 'just thinking of you, ready to talk yet?'" },
      { delay_days: 90, channel: "email", prompt: "Final ask — 'should I close this out, or want me to send a fresh estimate?'" },
    ],
  },
  {
    name: "Quoted, didn't close (4-touch)",
    description:
      "For leads that got a quote but never said yes. Pushes objection-handling and a fresh urgency angle.",
    steps: [
      { delay_days:  2, channel: "sms",   prompt: "Short reminder — 'did you have a chance to review the estimate?'" },
      { delay_days:  5, channel: "email", prompt: "Address common objections — financing options, payment plan, scope flexibility." },
      { delay_days: 10, channel: "sms",   prompt: "Soft urgency — 'we're booking up for next month, want to lock it in?'" },
      { delay_days: 21, channel: "email", prompt: "Last touch with a price refresh — offer to revisit the scope to fit their budget." },
    ],
  },
  {
    name: "Post-job upsell (3-touch)",
    description:
      "Send after the job is complete and review request fires. Plants seeds for related future work.",
    steps: [
      { delay_days: 30, channel: "email", prompt: "Helpful 'how to maintain your new [service]' tips. No sales." },
      { delay_days: 90, channel: "sms",   prompt: "Casual check-in — 'how's the [service] holding up? Anything else on the to-do list?'" },
      { delay_days: 180, channel: "email", prompt: "Suggest a related upsell — e.g. roofing customers get gutter cleaning, painters get exterior touch-ups." },
    ],
  },
  {
    name: "Win-back cold (3-touch)",
    description:
      "For customers who haven't booked in 12+ months. Reactivation cadence.",
    steps: [
      { delay_days:   1, channel: "sms",   prompt: "Quick 'it's been a while — anything new on the to-do list?'" },
      { delay_days:   7, channel: "email", prompt: "Seasonal angle — what's coming up that they should think about for the home now." },
      { delay_days:  30, channel: "sms",   prompt: "Loyalty offer — 'for past customers we'll throw in a free [small thing] this month.'" },
    ],
  },
];

// Default seasonal campaigns
export const DEFAULT_SEASONAL_CAMPAIGNS: {
  name: string;
  description: string;
  trigger_month: number;
  trigger_day: number;
  target_services: string[];
  prompt: string;
}[] = [
  {
    name: "Spring deep clean",
    description: "March 15 — remind past customers it's time for spring cleaning / deep clean.",
    trigger_month: 3, trigger_day: 15, target_services: ["cleaning", "deep clean"],
    prompt: "Friendly seasonal reminder. Spring deep-clean season is here — book a slot before May.",
  },
  {
    name: "Fall gutter cleaning",
    description: "September 20 — gutter cleaning before leaves drop and rain starts.",
    trigger_month: 9, trigger_day: 20, target_services: ["gutter", "roofing"],
    prompt: "Reminder that gutter cleaning before fall leaves drop prevents winter ice dams and roof damage.",
  },
  {
    name: "Pre-winter HVAC tune-up",
    description: "October 15 — heating system check before cold sets in.",
    trigger_month: 10, trigger_day: 15, target_services: ["hvac", "heating"],
    prompt: "Reminder to schedule heating system inspection before winter. Mention spotting issues early saves money.",
  },
  {
    name: "Snow removal pre-season",
    description: "November 1 — sign up for the snow plowing list.",
    trigger_month: 11, trigger_day: 1, target_services: ["snow", "landscaping"],
    prompt: "Last call to add their property to your snow plowing route this winter.",
  },
  {
    name: "Pre-spring landscaping",
    description: "February 25 — get on the spring landscaping schedule before everyone else.",
    trigger_month: 2, trigger_day: 25, target_services: ["landscaping", "lawn"],
    prompt: "Get on the spring landscaping schedule early — slots fill up by April.",
  },
];
