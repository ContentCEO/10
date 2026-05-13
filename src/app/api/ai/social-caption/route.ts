import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// AI social caption generator (Instagram + TikTok scripts).
// POST { kind: "instagram_caption" | "tiktok_script",
//        job_title?: string, service?: string, city?: string, key_points?: string[],
//        tone?: "friendly"|"casual"|"formal"|"direct" }
//
// Uses Anthropic Claude if ANTHROPIC_API_KEY is set; falls back to a
// template-based output so it still works without an API key.

interface Body {
  kind?: string;
  job_title?: string;
  service?: string;
  city?: string;
  key_points?: string[];
  tone?: "friendly" | "casual" | "formal" | "direct";
}

const TONE_LINES: Record<string, string> = {
  friendly: "Write like you're texting a neighbor — warm, real, lowercase-first OK.",
  casual:   "Sound like the host of a contractor TikTok — punchy and dropping pro tips.",
  formal:   "Professional, polished, third-person, suitable for company page.",
  direct:   "No fluff, all facts. Stop selling, just describe the work and the outcome.",
};

function templateInstagram(b: Body): { caption: string; hashtags: string[] } {
  const svc = b.service ?? b.job_title ?? "the job";
  const city = b.city ?? "your area";
  const lines = [
    `Just wrapped a beautiful ${svc} project in ${city}.`,
    "Real work · real homeowners · real results.",
    "",
    "Need yours done right the first time?",
    "DM us or hit the link in bio for a free quote.",
  ];
  const tags = [
    "#contractor", "#homeimprovement", "#renovation",
    `#${svc.replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
    `#${city.replace(/[^a-z0-9]/gi, "").toLowerCase()}`,
    "#beforeafter", "#construction", "#smallbusiness",
  ].filter((t) => t.length > 1);
  return { caption: lines.join("\n"), hashtags: tags };
}

function templateTiktok(b: Body): { script: string } {
  const svc = b.service ?? b.job_title ?? "the project";
  const city = b.city ?? "your area";
  const script =
`Hook (0-3s): "Watch what we did with this ${svc} in ${city}…"

Reveal (3-10s): Quick before/after cut. Camera pan across the finished work.

Pro tip (10-25s): "Here's the one thing most contractors mess up on ${svc} — [your pro tip]. We did it right because [reason]."

CTA (25-30s): "If you're thinking about ${svc} where you live, link in bio for a free quote. We'll come look same week."`;
  return { script };
}

async function callClaude(prompt: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { content?: { text?: string }[] };
    return data.content?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.kind || !["instagram_caption", "tiktok_script"].includes(body.kind)) {
    return NextResponse.json({ error: "kind must be instagram_caption or tiktok_script" }, { status: 400 });
  }

  const tone = body.tone ?? "friendly";
  const points = (body.key_points ?? []).filter(Boolean).slice(0, 6).join("; ");

  const prompt = body.kind === "instagram_caption"
    ? `You're writing an Instagram caption for a small contractor. ${TONE_LINES[tone]}

Service: ${body.service ?? "(not specified)"}
City: ${body.city ?? "(not specified)"}
Job title: ${body.job_title ?? "(not specified)"}
Key points: ${points || "(none provided)"}

Write:
1. Caption (3-5 short lines, no emojis at the start, one in the middle is OK)
2. A line break
3. 8-10 relevant hashtags on one line

Plain text only. No markdown, no quotes, no commentary.`
    : `You're writing a TikTok script for a small contractor. ${TONE_LINES[tone]}

Service: ${body.service ?? "(not specified)"}
City: ${body.city ?? "(not specified)"}
Job title: ${body.job_title ?? "(not specified)"}
Key points: ${points || "(none provided)"}

Output a 30-second script with these labeled beats:
- Hook (0-3s)
- Reveal (3-10s)
- Pro tip (10-25s)
- CTA (25-30s)

Each beat 1-2 sentences. Plain text. No markdown.`;

  const ai = await callClaude(prompt);
  if (ai) {
    return NextResponse.json({ ok: true, kind: body.kind, output: ai, source: "claude" });
  }

  // Fallback when Anthropic is unavailable.
  if (body.kind === "instagram_caption") {
    const { caption, hashtags } = templateInstagram(body);
    return NextResponse.json({ ok: true, kind: body.kind, output: `${caption}\n\n${hashtags.join(" ")}`, source: "template" });
  }
  return NextResponse.json({ ok: true, kind: body.kind, output: templateTiktok(body).script, source: "template" });
}
