import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateJson } from "@/lib/ai/anthropic";
import { SALES_ANALYST_SYSTEM, buildScriptPrompt } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  trade: z.string().min(1).max(120),
  scenario: z.string().min(3).max(400),
  tone: z.string().max(60).optional(),
  notes: z.string().max(800).optional(),
  save: z.boolean().optional(),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let result: { name: string; body: string };
  try {
    result = await generateJson({
      system: SALES_ANALYST_SYSTEM,
      prompt: buildScriptPrompt(parsed),
      maxTokens: 1500,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (parsed.save) {
    const { error } = await supabase.from("scripts").insert({
      user_id: user.id,
      name: result.name,
      scenario: parsed.scenario,
      trade: parsed.trade,
      body: result.body,
    });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(result);
}
