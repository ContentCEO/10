import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type BusinessContext = {
  name: string;
  industry?: string | null;
  description?: string | null;
  hours?: string | null;
  service_area?: string | null;
  booking_url?: string | null;
  ai_persona?: string | null;
};

const FALLBACK_REPLY =
  "Hi — sorry we missed your call! This is the team here. How can we help? " +
  "If you'd like to book a time, reply with your preferred day & time.";

function buildSystemPrompt(b: BusinessContext): string {
  const persona =
    b.ai_persona?.trim() ||
    "A friendly receptionist who qualifies leads quickly and books appointments.";

  return [
    `You are an SMS assistant for ${b.name}${b.industry ? ` (${b.industry})` : ""}.`,
    `Persona: ${persona}`,
    b.description ? `About the business: ${b.description}` : "",
    b.hours ? `Business hours: ${b.hours}` : "",
    b.service_area ? `Service area: ${b.service_area}` : "",
    b.booking_url ? `Booking link to share when the lead is ready: ${b.booking_url}` : "",
    "",
    "Goals, in order:",
    "1. Acknowledge the missed call warmly and apologise briefly.",
    "2. Ask one short question at a time to qualify the lead — what they need, location, timing.",
    "3. When the lead seems ready, offer to book a time and share the booking link if available.",
    "4. If they're not a fit (wrong area / service), thank them politely and suggest alternatives.",
    "",
    "Style rules:",
    "- SMS only. Hard cap each reply at 320 characters (≈2 SMS segments).",
    "- One question per message. Plain text. No emojis unless the lead used one first.",
    "- Never invent prices, availability, or guarantees. If unsure, say a human will confirm.",
    "- Never claim to be human. If asked, say you're an automated assistant for the business.",
    "- Reply with ONLY the SMS body — no preamble, no quoting, no signature blocks."
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Generate a single SMS reply given the business context and conversation history.
 * History should be in chronological order (oldest first) and include the latest inbound message.
 */
export async function generateSmsReply(
  business: BusinessContext,
  history: ChatMessage[]
): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) {
    return FALLBACK_REPLY;
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const messages =
    history.length > 0
      ? history
      : [
          {
            role: "user" as const,
            content: "(The lead just had their call go unanswered. Send the first SMS.)"
          }
        ];

  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      system: buildSystemPrompt(business),
      messages
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (!text) return FALLBACK_REPLY;
    return text.length > 480 ? text.slice(0, 480) : text;
  } catch (err) {
    console.error("[ai] generateSmsReply failed:", err);
    return FALLBACK_REPLY;
  }
}
