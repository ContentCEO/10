import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function getAnthropic() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export async function generateJson<T = unknown>(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<T> {
  const client = getAnthropic();
  const message = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: opts.maxTokens ?? 2000,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  return parseJson<T>(text);
}

function parseJson<T>(text: string): T {
  const direct = tryParse<T>(text);
  if (direct) return direct;

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) {
    const fenced = tryParse<T>(fenceMatch[1]);
    if (fenced) return fenced;
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    const sliced = tryParse<T>(text.slice(start, end + 1));
    if (sliced) return sliced;
  }

  throw new Error("Model did not return valid JSON");
}

function tryParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}
