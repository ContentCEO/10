import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai";

export const runtime = "nodejs";

interface Body {
  platform?: "instagram" | "tiktok" | "facebook" | "linkedin";
  service?: string;
  city?: string;
  angle?: "before_after" | "tip" | "testimonial" | "promo" | "behind_scenes";
  businessName?: string;
}

const ANGLE_PROMPTS: Record<NonNullable<Body["angle"]>, string> = {
  before_after:    "A 'before and after' style post showing a transformation.",
  tip:             "A short pro-tip post — teach the audience something useful.",
  testimonial:     "A customer testimonial / social proof post.",
  promo:           "A promotional / limited-time-offer post.",
  behind_scenes:   "A 'behind the scenes' post — show the work, the team, the process.",
};

const PLATFORM_STYLE: Record<NonNullable<Body["platform"]>, string> = {
  instagram: "Casual, friendly, story-driven. 3-6 short lines + emojis. Hooks reader in the first line.",
  tiktok:    "Very short, punchy, conversational. Hook in line 1. Use trending speech patterns.",
  facebook:  "Medium length, warmer/more personal tone. Can be 1-2 paragraphs. Direct call-to-action.",
  linkedin:  "Professional but approachable. Story or insight format. Slightly longer is fine. End with a question.",
};

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const platform = body.platform ?? "instagram";
  const service = (body.service ?? "general contractor").slice(0, 80);
  const city = (body.city ?? "").slice(0, 80);
  const angle = body.angle ?? "before_after";
  const businessName = (body.businessName ?? "our crew").slice(0, 120);

  const system =
`You write social media posts for contractors and home-service businesses.
Output STRICT JSON only — no prose before/after. Schema:
{ "variants": [ { "caption": "...", "hashtags": ["#tag1","#tag2",...] }, ... ] }
Generate exactly 3 variants. Each caption follows the platform style.
Hashtags: 8-15 per variant, mix of high-volume + niche + local.
Do NOT use generic spam tags like #love #instagood.`;

  const userMsg =
`Business: ${businessName}
Service: ${service}${city ? `\nCity: ${city}` : ""}
Platform: ${platform.toUpperCase()}
Style: ${PLATFORM_STYLE[platform]}
Angle: ${ANGLE_PROMPTS[angle]}

Generate 3 distinct variants. Each should feel different in voice/structure.`;

  try {
    const raw = await generateText({ system, user: userMsg, maxTokens: 1500 });
    // Try to find a JSON block; tolerate ```json fences
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return NextResponse.json({ error: "AI did not return JSON", raw }, { status: 502 });
    }
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as { variants?: { caption: string; hashtags: string[] }[] };
    return NextResponse.json({ variants: parsed.variants ?? [] });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Generation failed" }, { status: 500 });
  }
}
