import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { ProposalDraftInput } from "@/lib/types";

export type AIGeneration = {
  narrative: string;
  line_items: { description: string; quantity: number; unit: string; unit_price: number }[];
  payment_schedule: { label: string; percent: number; due: string }[];
  timeline: { phase: string; start: string; end: string; notes?: string }[];
  terms: string;
};

const SYSTEM_PROMPT = `You are an expert proposal writer for licensed contractors (general contractors, roofers, remodelers, landscapers, electricians, plumbers).

Given a job's details, you produce a polished, client-ready proposal. Always:
- Use a confident, professional, friendly tone — never salesy or fluffy.
- Be specific about scope, materials, and labor when given.
- Quantities should be realistic; unit prices should reflect typical US market rates for the project type.
- Payment schedules typically: 30% deposit, 40% mid-project milestone, 30% on completion (adjust if scope warrants).
- Timelines must be realistic for the scope; use ISO YYYY-MM-DD dates starting roughly 1 week from today.
- Terms should cover: change orders, warranties, materials, insurance, dispute resolution, cancellation.

Return ONLY a single JSON object. No prose, no markdown fences. Schema:
{
  "narrative": "string — 2-4 short paragraphs of professional proposal copy",
  "line_items": [{"description":"string","quantity":number,"unit":"string","unit_price":number}],
  "payment_schedule": [{"label":"string","percent":number,"due":"string"}],
  "timeline": [{"phase":"string","start":"YYYY-MM-DD","end":"YYYY-MM-DD","notes":"string"}],
  "terms": "string — markdown-friendly numbered list of standard terms & conditions"
}`;

function buildUserPrompt(input: ProposalDraftInput) {
  return [
    `Client name: ${input.client_name || "(not provided)"}`,
    `Project address: ${input.client_address || "(not provided)"}`,
    `Project type: ${input.project_type || "(not provided)"}`,
    `Scope of work: ${input.scope || "(not provided)"}`,
    `Measurements: ${input.measurements || "(not provided)"}`,
    `Materials: ${input.materials || "(not provided)"}`,
    `Labor notes: ${input.labor || "(not provided)"}`,
    `Additional notes: ${input.notes || "(none)"}`,
  ].join("\n");
}

function tryParseJson(text: string): AIGeneration {
  const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Model returned no JSON object");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function generateWithAnthropic(input: ProposalDraftInput): Promise<AIGeneration> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(input) }],
  });
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("Empty response from Claude");
  return tryParseJson(textBlock.text);
}

async function generateWithOpenAI(input: ProposalDraftInput): Promise<AIGeneration> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });
  const text = completion.choices[0]?.message?.content ?? "";
  return tryParseJson(text);
}

export async function generateProposal(input: ProposalDraftInput): Promise<AIGeneration> {
  const provider = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
  if (provider === "openai") {
    if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
    return generateWithOpenAI(input);
  }
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  return generateWithAnthropic(input);
}
