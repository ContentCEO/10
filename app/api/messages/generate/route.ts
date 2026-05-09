import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { generateMessage } from "@/lib/ai";
import type { Lead } from "@/lib/types";

const Body = z.object({
  leadId: z.string().uuid(),
  channel: z.enum(["sms", "email"]),
  goal: z.string().max(400).optional(),
  tone: z.string().max(200).optional(),
  customPrompt: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", body.leadId)
    .eq("workspace_id", ws.id)
    .maybeSingle();
  if (error || !lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const l = lead as Lead;
  if (body.channel === "email" && !l.email) {
    return NextResponse.json({ error: "Lead has no email" }, { status: 400 });
  }
  if (body.channel === "sms" && !l.phone) {
    return NextResponse.json({ error: "Lead has no phone" }, { status: 400 });
  }

  try {
    const result = await generateMessage({
      lead: l,
      channel: body.channel,
      businessContext: ws.business_context,
      goal: body.goal,
      tone: body.tone,
      customPrompt: body.customPrompt,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
