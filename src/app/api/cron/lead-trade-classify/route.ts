import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Auto-classify leads into trades. Runs every 15 min, picks up to 25
// leads with service_type or notes but no trade_tag, asks Claude
// Haiku to pick one of the canonical trades.
//
// Cheap + fast (Haiku, <1s per lead, sub-cent cost).

const TRADES = [
  "roofing", "plumbing", "electrical", "hvac", "painting",
  "carpentry", "flooring", "kitchen_remodel", "bathroom_remodel",
  "deck_patio", "fencing", "siding", "windows", "concrete",
  "landscaping", "tree_service", "cleaning", "handyman",
  "pest_control", "garage_door", "other",
];

interface LeadRow {
  id: string;
  name: string;
  service_type: string | null;
  notes: string | null;
}

const SYSTEM = `Classify a contractor lead into ONE trade from this exact list:
${TRADES.join(", ")}

Output a single word — the chosen trade slug, lowercase, with underscores
(e.g. "bathroom_remodel"). If you genuinely can't tell, output "other".
No quotes, no markdown, no explanation. Just one word.`;

function pickTrade(text: string): string | null {
  const t = text.trim().toLowerCase().replace(/[^a-z_]/g, "");
  return TRADES.includes(t) ? t : null;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: true, skipped: "no_api_key" });
  }

  const admin = createAdminClient();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { data: rows } = await admin
    .from("leads")
    .select("id,name,service_type,notes")
    .is("trade_tag", null)
    .or("service_type.not.is.null,notes.not.is.null")
    .order("created_at", { ascending: false })
    .limit(25);

  const leads = (rows ?? []) as LeadRow[];
  let tagged = 0;
  let failed = 0;

  for (const lead of leads) {
    const prompt = [
      lead.service_type ? `Service type: ${lead.service_type}` : null,
      lead.notes ? `Notes: ${lead.notes.slice(0, 800)}` : null,
    ].filter(Boolean).join("\n");
    if (!prompt) { failed++; continue; }

    try {
      const res = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 20,
        system: SYSTEM,
        messages: [{ role: "user", content: prompt }],
      });
      const text = res.content.find((b) => b.type === "text");
      const trade = text?.type === "text" ? pickTrade(text.text) : null;
      if (!trade) { failed++; continue; }
      await admin.from("leads").update({ trade_tag: trade }).eq("id", lead.id);
      tagged++;
    } catch { failed++; }
  }

  return NextResponse.json({ ok: true, considered: leads.length, tagged, failed });
}

export async function POST(request: Request) { return GET(request); }
