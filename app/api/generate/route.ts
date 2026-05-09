import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/claude";
import { SYSTEM_PROMPT, singlePrompt } from "@/lib/prompts";
import type { ContentType } from "@/lib/types";

const VALID_TYPES: ContentType[] = [
  "instagram_caption",
  "reel_idea",
  "before_after",
  "promo",
  "hashtags",
  "image_prompt",
];

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    type?: ContentType;
    topic?: string;
    save?: boolean;
  };
  if (!body.type || !VALID_TYPES.includes(body.type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Set up your business profile first" }, { status: 400 });
  }

  const { user: userPrompt, maxTokens } = singlePrompt(body.type, profile, body.topic);

  let text: string;
  try {
    text = await generateText({ system: SYSTEM_PROMPT, user: userPrompt, maxTokens });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generation failed" },
      { status: 500 },
    );
  }

  let saved = null;
  if (body.save) {
    const { data, error } = await supabase
      .from("content_items")
      .insert({
        user_id: user.id,
        type: body.type,
        title: body.topic || null,
        body: text,
        status: "draft",
      })
      .select()
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    saved = data;
  }

  return NextResponse.json({ body: text, item: saved });
}
