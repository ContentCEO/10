import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai";
import type { Lead, Profile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const leadId = body?.leadId as string | undefined;
  const tone = (body?.tone as string) || "professional";
  const tiered = Boolean(body?.tiered);
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const [{ data: lead }, { data: profile }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", leadId).single(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const l = lead as Lead;
  const p = profile as Profile | null;
  const business = p?.business_name || "Our company";

  const system = tiered
    ? "You write tiered project proposals for contractors using a Good / Better / Best " +
      "structure. Studies show clients pick the middle tier most often, lifting average " +
      "deal size 15-30%. Output plain text with three clearly labeled tiers, each with: " +
      "name, what's included (3-5 bullet points without markdown symbols), and total price. " +
      "After the three tiers, add a short 'Next Steps' section. No legal boilerplate."
    : "You write clean, professional project proposals/estimates for contractors. " +
      "Output plain text suitable for copy-pasting into a document. Use clear " +
      "section headings (no markdown symbols), short paragraphs, and a simple " +
      "line-item summary with prices. Do not include legal boilerplate.";

  const baseEstimate = l.estimated_value ?? null;
  const tieredPrompt =
    `Draft a ${tone} Good / Better / Best proposal.

Customer name: ${l.name}
Service requested: ${l.service_type ?? "(not specified)"}
Customer notes: ${l.notes ?? "(none)"}
Reference budget: ${baseEstimate ? `$${baseEstimate}` : "(use sensible market values)"}

Tiers:
- "Good" — practical scope, lower price (about 80% of reference)
- "Better" — recommended scope, mid price (about reference budget) — mark this the recommended option
- "Best" — premium scope with upgrades, higher price (about 130% of reference)

Sender business: ${business}
Sign off with the business name.`;

  const standardPrompt =
    `Draft a ${tone} proposal for this lead.

Customer name: ${l.name}
Service requested: ${l.service_type ?? "(not specified)"}
Customer notes: ${l.notes ?? "(none)"}
Estimated total: ${baseEstimate ? `$${baseEstimate}` : "(propose a reasonable estimate)"}

Sender business: ${business}

Include sections: Overview, Scope of Work, Timeline, Pricing (with 3-5 line items
that add up to the total), and Next Steps. Sign off with the business name.`;

  try {
    const text = await generateText({
      system,
      user: tiered ? tieredPrompt : standardPrompt,
      maxTokens: tiered ? 1600 : 1200,
    });
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
