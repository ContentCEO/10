import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Plan 1 / D-14 — AI blog post writer.
// POST /api/ai/blog-post { service, city, scope, outcome, customer_first_name? }
// Returns: { title, slug, markdown, meta_description }

interface Body { service?: string; city?: string; scope?: string; outcome?: string; customer_first_name?: string; tone?: "friendly"|"casual"|"formal"|"direct" }

const TONE_NOTES: Record<string, string> = {
  friendly: "Warm, real, conversational. Use contractions. Talk like a neighbor.",
  casual:   "Drop-into-DM voice. Short sentences. Mild slang OK. Stop selling.",
  formal:   "Polished, business-class. Third person. Industry-standard terms.",
  direct:   "Just the facts. Skip adjectives. State the work and the outcome.",
};

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function template(b: Body) {
  const svc = b.service ?? "the project";
  const city = b.city ?? "your area";
  const scope = b.scope ?? "a full scope-of-work";
  const outcome = b.outcome ?? "a delighted homeowner";
  const name = b.customer_first_name?.split(" ")[0] ?? "the homeowner";

  const title = `Inside a ${svc} in ${city}: scope, surprises, and the finish`;
  const md =
`# ${title}

A walk-through of a real ${svc} we just wrapped in ${city}, including the scope, the surprises, and how it ended.

## The starting point

${name} reached out asking about ${svc}. The scope on day one looked like ${scope}.

## What we ran into

Every project has surprises. On this one, the most important thing to flag was the unexpected work that came up once we got into the demolition. We handled it before it became a problem.

## The finish

We ended with ${outcome}. The whole thing took about as long as we promised and finished within a couple hundred dollars of the estimate.

## Why this matters if you're considering ${svc}

Three things to know:

1. **Get a real estimate.** Numbers off the internet aren't your numbers.
2. **Ask about surprises.** A good contractor budgets for them.
3. **See the work in person.** Photos lie. Walk a recent job before you sign.

Thinking about ${svc} in ${city}? We'd be happy to come out for a no-pressure look.
`;

  return {
    title,
    slug: slugify(title),
    markdown: md,
    meta_description: `Real ${svc} project in ${city}: scope, surprises, and the outcome. From the crew that did the work.`,
  };
}

async function callClaude(prompt: string): Promise<string | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
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
`Write a 700-900 word blog post for a contractor's website about a real project they just finished. ${TONE_NOTES[tone]}

Service: ${body.service}
City: ${body.city ?? "(not specified)"}
Scope: ${body.scope ?? "(not specified)"}
Outcome: ${body.outcome ?? "(not specified)"}
Customer first name (use sparingly, never last name): ${body.customer_first_name ?? "(not specified)"}

Output format (plain text, NO markdown fences):

TITLE: <SEO-friendly title, 50-70 chars>
META: <meta description, 140-160 chars>
SLUG: <kebab-case slug, max 80 chars>
---
<full blog post, Markdown formatted with ## headings, 700-900 words>

Use H2 sections. Include 3-5 actionable takeaways for homeowners considering the same work. End with a soft CTA to book a free estimate.`;

  const ai = await callClaude(prompt);
  if (ai) {
    // Parse the structured AI output.
    const titleMatch = ai.match(/TITLE:\s*(.+)/);
    const metaMatch  = ai.match(/META:\s*(.+)/);
    const slugMatch  = ai.match(/SLUG:\s*(.+)/);
    const mdMatch    = ai.split(/^---\s*$/m);
    return NextResponse.json({
      ok: true,
      source: "claude",
      title: titleMatch?.[1]?.trim() ?? "Blog post",
      meta_description: metaMatch?.[1]?.trim() ?? "",
      slug: slugify(slugMatch?.[1]?.trim() ?? titleMatch?.[1]?.trim() ?? "blog-post"),
      markdown: mdMatch.length > 1 ? mdMatch[1].trim() : ai,
    });
  }

  return NextResponse.json({ ok: true, source: "template", ...template(body) });
}
