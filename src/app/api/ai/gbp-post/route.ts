import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Plan 1 / D-3 — Google Business Profile post template.
// We don't auto-post (that needs GBP OAuth + a Google partnership for
// scaled use) — we generate the optimal post text for the contractor to
// paste into GBP themselves.

interface Body { service?: string; city?: string; job_outcome?: string; tone?: "friendly"|"casual"|"formal"|"direct" }

const TONE_NOTES: Record<string, string> = {
  friendly: "Warm + conversational. Use contractions. Sound human.",
  casual:   "Punchy, social-media-ready. Short sentences. Some attitude.",
  formal:   "Polished, professional, builder-of-record voice.",
  direct:   "No fluff. Lead with the outcome. Skip adjectives.",
};

function template(b: Body) {
  const svc = b.service ?? "our recent project";
  const city = b.city ?? "the area";
  const outcome = b.job_outcome ?? "another happy customer";

  // Google Business Profile posts have a 1,500 char limit. We target ~600
  // chars (the sweet spot for engagement).
  const body =
`Just wrapped a ${svc} in ${city} — ${outcome}.

Three things we focused on:
✓ Clean job-site every day
✓ On-time finish, on-budget
✓ A 1-year labor warranty in writing

Thinking about ${svc}? Tap below for a free same-day quote.`;

  const title = `${svc.charAt(0).toUpperCase() + svc.slice(1)} · ${city}`;

  return { title, body, cta_label: "Get free quote", char_count: body.length };
}

async function callClaude(prompt: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json() as { content?: { text?: string }[] };
    return data.content?.[0]?.text ?? null;
  } catch { return null; }
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.service) {
    return NextResponse.json({ error: "service required" }, { status: 400 });
  }

  const tone = body.tone ?? "friendly";
  const prompt =
`Write a Google Business Profile post for a contractor. Max 1,500 chars but target 500-700 for best engagement.
${TONE_NOTES[tone]}

Service: ${body.service}
City: ${body.city ?? "(not specified)"}
Outcome: ${body.job_outcome ?? "(not specified)"}

Format the output as plain text only (no markdown).
Include:
- A hook line that mentions the service + city
- 3 bullet points using ✓ as the bullet character
- A 1-line CTA at the end

Output the post text directly with no preamble.`;

  const ai = await callClaude(prompt);
  if (ai) {
    return NextResponse.json({
      ok: true,
      source: "claude",
      title: `${body.service} · ${body.city ?? ""}`.trim(),
      body: ai.trim(),
      cta_label: "Get free quote",
      char_count: ai.trim().length,
    });
  }

  return NextResponse.json({ ok: true, source: "template", ...template(body) });
}
