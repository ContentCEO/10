import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { env, isAiConfigured } from "@/lib/env";

const CLAUDE_MODEL = "claude-sonnet-4-6";
const OPENAI_MODEL = "gpt-4o-mini";

export type AiOptions = {
  system: string;
  prompt: string;
  maxTokens?: number;
};

export async function generateText({ system, prompt, maxTokens = 2000 }: AiOptions): Promise<string> {
  if (env.anthropicKey) {
    const client = new Anthropic({ apiKey: env.anthropicKey });
    const res = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }

  if (env.openaiKey) {
    const client = new OpenAI({ apiKey: env.openaiKey });
    const res = await client.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });
    return res.choices[0]?.message?.content ?? "";
  }

  return "";
}

export async function generateJson<T>({ system, prompt, maxTokens = 2500 }: AiOptions): Promise<T | null> {
  const wrapped = `${prompt}\n\nReturn ONLY valid JSON with no surrounding prose, code fences, or commentary.`;
  const raw = await generateText({ system, prompt: wrapped, maxTokens });
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();
  const start = cleaned.indexOf("{");
  const startArr = cleaned.indexOf("[");
  const begin =
    start === -1 ? startArr : startArr === -1 ? start : Math.min(start, startArr);
  const slice = begin >= 0 ? cleaned.slice(begin) : cleaned;
  try {
    return JSON.parse(slice) as T;
  } catch {
    return null;
  }
}

export { isAiConfigured };
