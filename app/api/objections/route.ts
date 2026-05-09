import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateJson } from "@/lib/ai/anthropic";
import { SALES_ANALYST_SYSTEM, buildObjectionPrompt } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

const Body = z.object({
  objection: z.string().min(3).max(400),
  trade: z.string().max(120).optional(),
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

  let result: { category: string; response: string };
  try {
    result = await generateJson({
      system: SALES_ANALYST_SYSTEM,
      prompt: buildObjectionPrompt(parsed.objection, parsed.trade),
      maxTokens: 600,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (parsed.save) {
    const { error } = await supabase.from("objections").insert({
      user_id: user.id,
      objection: parsed.objection,
      category: result.category,
      response: result.response,
    });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(result);
}
