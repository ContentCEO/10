import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

// AI weekly social content calendar. GET /api/ai/content-calendar
// Returns 5 social posts for the week, each with platform, copy,
// photo prompt, and best-time-to-post hint. Tuned for contractors
// (before/after, customer testimonial, problem/solution, FAQ, behind-scenes).

interface Post {
  day: string;          // "Monday"
  platform: "instagram" | "facebook" | "gbp" | "tiktok" | "nextdoor";
  hook: string;         // first 80 chars that stop scrolling
  body: string;         // full post copy
  photo_prompt: string; // what to shoot
  best_time: string;    // human-readable, e.g. "Tue 11am"
}

const SYSTEM = `You write 1 week of contractor social-media posts. 5 posts
total, Mon-Fri. Each post is a different format:
  Monday    — before/after
  Tuesday   — customer testimonial
  Wednesday — problem/solution explainer
  Thursday  — FAQ / common mistake
  Friday    — behind-the-scenes / team

Return EXACTLY this JSON:
[
  {
    "day": "Monday",
    "platform": "instagram" | "facebook" | "gbp" | "tiktok" | "nextdoor",
    "hook": "string · ≤80 chars, scroll-stopping",
    "body": "string · 80-200 words, plain text, no hashtags",
    "photo_prompt": "string · what to shoot",
    "best_time": "string · day + time, e.g. 'Mon 11am'"
  },
  ...4 more
]

Rules:
- Tailor to the contractor's business name and services
- Pick the right platform per post (b/a = IG, testimonial = GBP, explainer = FB, FAQ = Nextdoor, behind-scenes = TikTok)
- No markdown. JSON array only.`;

function parse(text: string): Post[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end < 0) return null;
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(arr) || arr.length === 0) return null;
    return arr as Post[];
  } catch { return null; }
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const { data: profile } = await supabase
    .from("profiles").select("business_name,services,service_cities")
    .eq("id", user.id).maybeSingle();
  const prof = profile as { business_name: string | null; services: string[] | null; service_cities: string[] | null } | null;

  const prompt = [
    `Business: ${prof?.business_name ?? "(unnamed)"}`,
    `Services: ${(prof?.services ?? []).join(", ") || "(general contracting)"}`,
    `Service area: ${(prof?.service_cities ?? []).join(", ") || "(general metro)"}`,
    `Generate 5 posts for the upcoming week (Mon-Fri).`,
  ].join("\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") {
      return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    }
    const posts = parse(text.text);
    if (!posts) return NextResponse.json({ error: "Couldn't parse AI output" }, { status: 502 });
    return NextResponse.json({ ok: true, posts });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "AI call failed",
    }, { status: 502 });
  }
}
