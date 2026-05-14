import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

// Auto-draft a proposal when a lead flips to "estimate" or
// "estimate_sent" status and doesn't yet have one.
//
// Runs every 30 min. Sonnet 4.6 because we want quality here.
// Saves as status='draft' so the contractor reviews + sends.

interface LeadRow {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  customer_id: string | null;
  service_type: string | null;
  notes: string | null;
  price: number | null;
  estimate_sent_at: string | null;
  status: string;
}

interface Tier { name: string; price_cents: number; scope: string; bullets: string[]; }
interface Draft { title: string; intro: string; tiers: Tier[]; terms: string; }

const SYSTEM = `You draft 3-tier contractor proposals (Good/Better/Best).
Return EXACTLY this JSON:
{
  "title": "string",
  "intro": "1-2 sentences opening to the homeowner",
  "tiers": [
    {"name":"Good","price_cents":0,"scope":"1 sentence","bullets":["...","..."]},
    {"name":"Better","price_cents":0,"scope":"1 sentence","bullets":["...","..."]},
    {"name":"Best","price_cents":0,"scope":"1 sentence","bullets":["...","..."]}
  ],
  "terms": "2-4 sentences plain-English terms"
}

Better anchors at the lead's estimated price (or $5000 fallback);
Good = 65% × Better; Best = 145% × Better.
4-6 bullets per tier. No markdown. JSON only.`;

function parse(text: string): Draft | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1));
    if (!obj.title || !Array.isArray(obj.tiers)) return null;
    return obj as Draft;
  } catch { return null; }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ok: true, skipped: "no_api_key" });
  }

  const admin = createAdminClient();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Leads in estimate-ish status with no proposal yet.
  const { data: rows } = await admin
    .from("leads")
    .select("id,user_id,name,email,customer_id,service_type,notes,price,estimate_sent_at,status")
    .in("status", ["estimate", "estimate_sent"])
    .limit(50);

  const leads = (rows ?? []) as LeadRow[];
  if (leads.length === 0) return NextResponse.json({ ok: true, considered: 0, drafted: 0 });

  // Filter out those that already have a proposal.
  const leadIds = leads.map((l) => l.id);
  const { data: existing } = await admin
    .from("proposals").select("lead_id").in("lead_id", leadIds);
  const haveProposal = new Set(((existing ?? []) as { lead_id: string | null }[])
    .map((p) => p.lead_id).filter(Boolean) as string[]);

  let drafted = 0;
  let failed = 0;

  for (const lead of leads) {
    if (haveProposal.has(lead.id)) continue;

    const userPrompt = [
      `Customer: ${lead.name}`,
      lead.service_type ? `Service: ${lead.service_type}` : "",
      lead.price ? `Estimated value anchor: $${lead.price}` : "Estimated value anchor: $5000",
      lead.notes ? `Notes:\n${lead.notes.slice(0, 1500)}` : "",
    ].filter(Boolean).join("\n");

    try {
      const res = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: "user", content: userPrompt }],
      });
      const text = res.content.find((b) => b.type === "text");
      if (!text || text.type !== "text") { failed++; continue; }
      const draft = parse(text.text);
      if (!draft) { failed++; continue; }

      const totalCents = draft.tiers[1]?.price_cents ?? draft.tiers[0]?.price_cents ?? 500000;

      await admin.from("proposals").insert({
        user_id: lead.user_id,
        customer_id: lead.customer_id,
        lead_id: lead.id,
        title: draft.title,
        status: "draft",
        intro: draft.intro,
        terms: draft.terms,
        total_cents: totalCents,
        tiers: draft.tiers,
        internal_notes: `Auto-drafted by AI on ${new Date().toISOString().slice(0, 10)}`,
      });
      drafted++;
    } catch { failed++; }
  }

  return NextResponse.json({ ok: true, considered: leads.length, drafted, failed });
}

export async function POST(request: Request) { return GET(request); }
