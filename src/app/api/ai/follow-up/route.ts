import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai";
import { LEAD_STATUS_LABELS, type Lead, type Profile } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const leadId = body?.leadId as string | undefined;
  const tone = (body?.tone as string) || "friendly";
  if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

  const [{ data: lead }, { data: profile }] = await Promise.all([
    supabase.from("leads").select("*").eq("id", leadId).single(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const l = lead as Lead;
  const p = profile as Profile | null;
  const business = p?.business_name || "our team";

  const system =
    "You write short, professional follow-up messages for contractors and " +
    "home service business owners. Output the message body only — no greetings " +
    "like 'Sure, here is...' and no markdown. Aim for 3-5 sentences.";

  const user_prompt = `Write a ${tone} follow-up SMS/email for this lead:

Lead name: ${l.name}
Service requested: ${l.service_type ?? "(not specified)"}
Current status: ${LEAD_STATUS_LABELS[l.status]}
Estimated value: ${l.estimated_value ? `$${l.estimated_value}` : "(unknown)"}
Notes: ${l.notes ?? "(none)"}

Sender business: ${business}
Sender name: ${p?.full_name ?? "(use the business name)"}

Goal: re-engage them and move toward booking the job. Sign off with the business name.`;

  try {
    const text = await generateText({ system, user: user_prompt, maxTokens: 500 });
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
