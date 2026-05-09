import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type ChatMsg = { role: "user" | "assistant"; content: string };

export type ChatOptions = {
  system: string;
  messages: ChatMsg[];
  maxTokens?: number;
  temperature?: number;
};

export type ChatProvider = "anthropic" | "openai";

function activeProvider(): ChatProvider {
  const p = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
  if (p === "openai") return "openai";
  return "anthropic";
}

export async function chatComplete(opts: ChatOptions): Promise<string> {
  const provider = activeProvider();

  if (provider === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not set");
    }
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const resp = await client.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      system: opts.system,
      max_tokens: opts.maxTokens ?? 600,
      temperature: opts.temperature ?? 0.4,
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const text = resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n")
      .trim();
    return text;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }
  const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const resp = await oai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 600,
    messages: [
      { role: "system", content: opts.system },
      ...opts.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });
  return resp.choices[0]?.message?.content?.trim() ?? "";
}

/** Lightweight JSON-mode helper used by the lead qualifier. */
export async function chatCompleteJson<T>(opts: ChatOptions): Promise<T | null> {
  const text = await chatComplete({
    ...opts,
    temperature: opts.temperature ?? 0,
    maxTokens: opts.maxTokens ?? 500,
  });

  // Strip code fences if the model added them despite instructions.
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract the first {...} block.
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]) as T;
    } catch {
      return null;
    }
  }
}
