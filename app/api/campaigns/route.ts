import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

const Step = z.object({
  delay_days: z.number().int().min(0).max(365),
  channel: z.enum(["sms", "email"]),
  prompt: z.string().max(2000),
});

const Body = z.object({
  name: z.string().min(1).max(120),
  channel: z.enum(["sms", "email"]),
  goal: z.string().max(400).optional(),
  tone: z.string().max(200).optional(),
  steps: z.array(Step).max(20).default([]),
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

  const { data, error } = await supabase
    .from("campaigns")
    .insert({
      workspace_id: ws.id,
      name: body.name,
      channel: body.channel,
      goal: body.goal ?? null,
      tone: body.tone ?? "friendly",
      steps: body.steps,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
