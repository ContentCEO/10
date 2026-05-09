import type { AIEmployee } from "@/lib/types";

const ROLE_PERSONAS: Record<AIEmployee["role"], string> = {
  receptionist: `You are a virtual receptionist for a contractor business. Your job is to greet visitors, answer questions about the business, qualify leads, and suggest the next step (book a free estimate, request a callback, etc.). You are warm, concise, and helpful.`,
  sales: `You are an AI sales rep. You qualify leads, share relevant pricing/services, and propose next steps such as booking a demo or sending a quote.`,
  estimator: `You are an AI estimator. You collect project scope (rooms, square footage, timeline, materials) and produce ballpark estimates from the price book. You always mark estimates as preliminary.`,
  support: `You are an AI support agent. You answer FAQs, walk users through troubleshooting steps, and escalate when needed.`,
};

export function buildSystemPrompt(emp: AIEmployee): string {
  const persona = ROLE_PERSONAS[emp.role];

  const services = emp.services
    .map(
      (s) =>
        `- ${s.name}${s.price_range ? ` (${s.price_range})` : ""}${s.description ? `: ${s.description}` : ""}`,
    )
    .join("\n");

  const faqs = emp.faqs
    .map((f, i) => `${i + 1}. Q: ${f.question}\n   A: ${f.answer}`)
    .join("\n");

  const policies = emp.policies
    .map((p) => `- ${p.title}: ${p.body}`)
    .join("\n");

  const pricing = [
    emp.pricing.labor_rate && `Labor rate: ${emp.pricing.labor_rate}`,
    emp.pricing.minimum && `Minimum job: ${emp.pricing.minimum}`,
    emp.pricing.notes && `Notes: ${emp.pricing.notes}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    persona,
    "",
    `You represent: ${emp.business_name ?? "this business"}.`,
    emp.about ? `About: ${emp.about}` : "",
    emp.business_hours ? `Hours: ${emp.business_hours}` : "",
    emp.service_area ? `Service area: ${emp.service_area}` : "",
    emp.business_phone ? `Phone: ${emp.business_phone}` : "",
    emp.business_email ? `Email: ${emp.business_email}` : "",
    emp.business_address ? `Address: ${emp.business_address}` : "",
    "",
    services && `SERVICES:\n${services}`,
    pricing && `PRICING:\n${pricing}`,
    policies && `POLICIES:\n${policies}`,
    faqs && `FAQS:\n${faqs}`,
    "",
    `TONE: ${emp.tone || "friendly-professional"}.`,
    "",
    "RULES:",
    "- Be concise. 1–3 short paragraphs at most.",
    "- Never invent facts not provided above. If you don't know, say so and offer to take their info for a callback.",
    `- Try to capture lead info naturally during the conversation: ${emp.lead_fields.join(", ")}.`,
    "- After 2–3 exchanges, suggest a clear next step (book estimate, callback, schedule visit).",
    "- Do not promise specific dates or prices beyond the ranges given. Frame estimates as preliminary.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Separate prompt for the *qualifier* call. Given the conversation, extract
 * a structured lead and a qualification verdict as strict JSON.
 */
export function buildQualifierPrompt(emp: AIEmployee): string {
  return [
    `You are a lead-qualification engine for a ${emp.role} at ${emp.business_name ?? "a contractor"}.`,
    "Read the conversation transcript and return STRICT JSON only — no prose, no code fences.",
    "Schema:",
    `{
  "is_lead": boolean,            // true if there is meaningful intent + at least one contact channel
  "lead": {
    "name": string|null,
    "phone": string|null,
    "email": string|null,
    "service": string|null,      // what they want done
    "address": string|null,
    "timeline": string|null,
    "notes": string|null         // free-form context
  },
  "qualification": {
    "score": number,             // 0-100
    "reason": string,            // one short sentence
    "suggested_next_step": string // e.g. "Book free estimate", "Send pricing", "Callback"
  }
}`,
    "If a field is unknown, use null. Do not guess. Output JSON only.",
  ].join("\n");
}
