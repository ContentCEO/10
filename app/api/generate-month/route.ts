import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateJSON } from "@/lib/claude";
import { SYSTEM_PROMPT, monthlyPlanPrompt } from "@/lib/prompts";
import type { ContentType } from "@/lib/types";

export const maxDuration = 120;

interface Plan {
  items: Array<{
    day: number;
    type: ContentType;
    title?: string;
    body: string;
    hashtags?: string;
    image_prompt?: string;
  }>;
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("business_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) {
    return NextResponse.json({ error: "Set up your business profile first" }, { status: 400 });
  }

  const { user: userPrompt, maxTokens } = monthlyPlanPrompt(profile);
  let plan: Plan;
  try {
    plan = await generateJSON<Plan>({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      maxTokens,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Plan generation failed" },
      { status: 500 },
    );
  }
  if (!plan?.items?.length) {
    return NextResponse.json({ error: "Empty plan returned" }, { status: 500 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = plan.items.slice(0, 30).map((it) => {
    const d = new Date(today);
    d.setDate(today.getDate() + Math.max(0, (it.day ?? 1) - 1));
    return {
      user_id: user.id,
      type: it.type,
      title: it.title ?? null,
      body: it.body,
      hashtags: it.hashtags ?? null,
      image_prompt: it.image_prompt ?? null,
      scheduled_for: d.toISOString().slice(0, 10),
      status: "draft" as const,
      metadata: { source: "monthly_plan" },
    };
  });

  const { error } = await supabase.from("content_items").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ created: rows.length });
}
