import Anthropic from "@anthropic-ai/sdk";
import type { Lead, Channel } from "./types";

const SYSTEM = `You are a lead reactivation specialist writing short, warm, human-sounding follow-ups to prospects who went cold. Goals:
- Sound like a real person, not marketing copy.
- Reference what you know about the lead specifically (company, prior interest, notes).
- Be brief. SMS: under 320 chars, no links unless asked. Email: ~80 words, with subject line.
- Single clear CTA (book a quick call, reply yes/no, etc).
- Never invent facts not in the lead data or business context.
- No emojis unless the tone explicitly asks for them.`;

export interface GenerateMessageInput {
  lead: Pick<Lead, "first_name" | "last_name" | "company" | "notes" | "tags" | "source">;
  channel: Channel;
  businessContext?: string | null;
  goal?: string | null;
  tone?: string | null;
  customPrompt?: string | null;
}

export interface GenerateMessageOutput {
  subject?: string;
  body: string;
}

export async function generateMessage(input: GenerateMessageInput): Promise<GenerateMessageOutput> {
  const userPrompt = buildPrompt(input);

  if (process.env.ANTHROPIC_API_KEY) {
    return await runAnthropic(userPrompt, input.channel);
  }
  if (process.env.OPENAI_API_KEY) {
    return await runOpenAI(userPrompt, input.channel);
  }
  throw new Error("No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY.");
}

function buildPrompt(i: GenerateMessageInput): string {
  const name = [i.lead.first_name, i.lead.last_name].filter(Boolean).join(" ") || "there";
  const lines = [
    `Channel: ${i.channel.toUpperCase()}`,
    `Lead name: ${name}`,
    i.lead.company ? `Company: ${i.lead.company}` : null,
    i.lead.source ? `Source: ${i.lead.source}` : null,
    i.lead.tags?.length ? `Tags: ${i.lead.tags.join(", ")}` : null,
    i.lead.notes ? `Notes: ${i.lead.notes}` : null,
    i.businessContext ? `\nOur business: ${i.businessContext}` : null,
    i.goal ? `Goal of this message: ${i.goal}` : "Goal: re-engage and book a quick call.",
    i.tone ? `Tone: ${i.tone}` : "Tone: friendly, casual, professional.",
    i.customPrompt ? `\nExtra instructions: ${i.customPrompt}` : null,
    "",
    i.channel === "email"
      ? `Return JSON: {"subject": "...", "body": "..."} — body in plain text with line breaks.`
      : `Return JSON: {"body": "..."} — single SMS, under 320 characters.`,
  ].filter(Boolean);
  return lines.join("\n");
}

async function runAnthropic(prompt: string, channel: Channel): Promise<GenerateMessageOutput> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    system: SYSTEM,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  return parseModelJson(text, channel);
}

async function runOpenAI(prompt: string, channel: Channel): Promise<GenerateMessageOutput> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  const text = json.choices?.[0]?.message?.content ?? "";
  return parseModelJson(text, channel);
}

function parseModelJson(text: string, channel: Channel): GenerateMessageOutput {
  const match = text.match(/\{[\s\S]*\}/);
  const raw = match ? match[0] : text;
  try {
    const parsed = JSON.parse(raw);
    if (channel === "email") {
      return { subject: String(parsed.subject ?? "Quick question"), body: String(parsed.body ?? "") };
    }
    return { body: String(parsed.body ?? text) };
  } catch {
    return channel === "email"
      ? { subject: "Quick question", body: text }
      : { body: text };
  }
}
