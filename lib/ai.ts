import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type {
  AdCreative,
  Business,
  CampaignStructure,
  GenerateAdsResponse,
  Offer,
  Product,
} from "./types";

const PROVIDER = (process.env.AI_PROVIDER || "anthropic").toLowerCase();
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const SYSTEM_PROMPT = `You are AdForge AI, a senior direct-response performance marketer who writes
high-converting Meta (Facebook + Instagram) ads. You apply proven copywriting
frameworks (PAS, AIDA, Hook-Story-Offer, Problem-Agitate-Solution, Before-After-Bridge),
write with concrete specificity, and tailor tone to the brand voice provided.

Output JSON ONLY. Do not include markdown fences or commentary outside the JSON.`;

type GenerateInput = {
  business: Pick<
    Business,
    "name" | "industry" | "description" | "target_audience" | "brand_voice" | "unique_value_prop"
  >;
  product: Pick<
    Product,
    "name" | "description" | "price" | "features" | "benefits" | "pain_points"
  >;
  offer: Pick<Offer, "headline" | "details" | "cta" | "guarantee" | "urgency" | "bonus">;
  objective?: string;
  numVariants?: number;
};

function buildUserPrompt(input: GenerateInput): string {
  const numVariants = Math.min(Math.max(input.numVariants ?? 4, 1), 8);
  const objective = input.objective || "conversions";

  return `Generate ${numVariants} distinct Meta ad creative variants and a campaign structure plan.

# Business
Name: ${input.business.name}
Industry: ${input.business.industry || "n/a"}
Description: ${input.business.description || "n/a"}
Target audience: ${input.business.target_audience || "n/a"}
Brand voice: ${input.business.brand_voice || "clear, confident, friendly"}
Unique value prop: ${input.business.unique_value_prop || "n/a"}

# Product / Service
Name: ${input.product.name}
Description: ${input.product.description || "n/a"}
Price: ${input.product.price || "n/a"}
Features: ${input.product.features || "n/a"}
Benefits: ${input.product.benefits || "n/a"}
Pain points it solves: ${input.product.pain_points || "n/a"}

# Offer
Headline: ${input.offer.headline}
Details: ${input.offer.details || "n/a"}
CTA: ${input.offer.cta || "Shop Now"}
Guarantee: ${input.offer.guarantee || "n/a"}
Urgency: ${input.offer.urgency || "n/a"}
Bonus: ${input.offer.bonus || "n/a"}

# Campaign objective
${objective}

# Required JSON shape
{
  "creatives": [
    {
      "variant_label": "Variant A",
      "angle": "the persuasion angle (problem-solution, social proof, transformation, FOMO, authority, etc.)",
      "headline": "<= 40 chars, scroll-stopping",
      "primary_text": "120-180 words, hook in first line, body, CTA",
      "description": "<= 30 char link description",
      "hook": "the first 1-2 lines designed to stop the scroll",
      "cta": "one of: Shop Now, Learn More, Sign Up, Get Offer, Book Now, Subscribe",
      "image_prompt": "a vivid, specific prompt for an image generator (subject, setting, lighting, mood, style)",
      "video_script": "30-second UGC-style script with timestamps: 0-3s hook, 3-15s problem/agitation, 15-25s solution/demo, 25-30s CTA"
    }
  ],
  "campaign_structure": {
    "campaign": {
      "name": "string",
      "objective": "${objective}",
      "budget_suggestion": "daily budget recommendation with rationale"
    },
    "ad_sets": [
      {
        "name": "string",
        "audience": "interests / lookalikes / custom audiences detail",
        "placements": ["Facebook Feed", "Instagram Feed", "Reels", "Stories"],
        "budget_split": "what % of budget"
      }
    ],
    "testing_plan": "how to test these variants over the first 7-14 days",
    "kpis": ["CTR", "CPC", "CPA", "ROAS"]
  }
}

Return JSON only. Use distinct angles across variants. Make every word earn its place.`;
}

function parseJson<T>(raw: string): T {
  let text = raw.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("AI response did not contain JSON");
  }
  return JSON.parse(text.slice(start, end + 1)) as T;
}

async function callAnthropic(prompt: string): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("No text in Anthropic response");
  return block.text;
}

async function callOpenAI(prompt: string): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const res = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.85,
  });
  return res.choices[0]?.message?.content ?? "";
}

export async function generateAds(input: GenerateInput): Promise<GenerateAdsResponse> {
  const prompt = buildUserPrompt(input);
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasAnthropic && !hasOpenAI) {
    throw new Error(
      "No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY in your environment.",
    );
  }

  const useAnthropic =
    (PROVIDER === "anthropic" && hasAnthropic) || (PROVIDER !== "openai" && hasAnthropic);

  const raw = useAnthropic ? await callAnthropic(prompt) : await callOpenAI(prompt);
  const parsed = parseJson<GenerateAdsResponse>(raw);

  const creatives: AdCreative[] = (parsed.creatives || []).map((c, i) => ({
    variant_label: c.variant_label || `Variant ${String.fromCharCode(65 + i)}`,
    angle: c.angle || "",
    headline: c.headline || "",
    primary_text: c.primary_text || "",
    description: c.description || "",
    hook: c.hook || "",
    cta: c.cta || "Learn More",
    image_prompt: c.image_prompt || "",
    video_script: c.video_script || "",
  }));

  const structure: CampaignStructure = parsed.campaign_structure || {
    campaign: { name: input.product.name, objective: input.objective || "conversions", budget_suggestion: "" },
    ad_sets: [],
    testing_plan: "",
    kpis: [],
  };

  return { creatives, campaign_structure: structure };
}
