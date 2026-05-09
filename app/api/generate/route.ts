import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateAds } from "@/lib/ai";
import { PLAN_LIMITS } from "@/lib/plans";
import type { Plan } from "@/lib/types";

export const maxDuration = 60;

const Input = z.object({
  businessId: z.string().uuid(),
  productName: z.string().min(1),
  productDescription: z.string().optional().default(""),
  productPrice: z.string().optional().default(""),
  productFeatures: z.string().optional().default(""),
  productBenefits: z.string().optional().default(""),
  productPainPoints: z.string().optional().default(""),
  offerHeadline: z.string().min(1),
  offerDetails: z.string().optional().default(""),
  offerCta: z.string().optional().default("Shop Now"),
  offerGuarantee: z.string().optional().default(""),
  offerUrgency: z.string().optional().default(""),
  offerBonus: z.string().optional().default(""),
  objective: z.string().optional().default("conversions"),
  numVariants: z.number().int().min(1).max(8).optional().default(4),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Input.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const input = parsed.data;

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, monthly_generations_used, monthly_generations_reset_at")
    .eq("id", user.id)
    .single();

  if (profile) {
    const reset = new Date(profile.monthly_generations_reset_at);
    const now = new Date();
    const monthsElapsed =
      (now.getFullYear() - reset.getFullYear()) * 12 + (now.getMonth() - reset.getMonth());
    if (monthsElapsed >= 1) {
      await supabase
        .from("profiles")
        .update({ monthly_generations_used: 0, monthly_generations_reset_at: now.toISOString() })
        .eq("id", user.id);
      profile.monthly_generations_used = 0;
    }
    const limit = PLAN_LIMITS[(profile.plan as Plan) ?? "free"];
    if ((profile.monthly_generations_used ?? 0) >= limit) {
      return NextResponse.json(
        { error: `You've used all ${limit} generations for this month. Upgrade to keep going.` },
        { status: 402 },
      );
    }
  }

  const { data: business, error: bErr } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", input.businessId)
    .eq("user_id", user.id)
    .single();
  if (bErr || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  let result;
  try {
    result = await generateAds({
      business: {
        name: business.name,
        industry: business.industry,
        description: business.description,
        target_audience: business.target_audience,
        brand_voice: business.brand_voice,
        unique_value_prop: business.unique_value_prop,
      },
      product: {
        name: input.productName,
        description: input.productDescription,
        price: input.productPrice,
        features: input.productFeatures,
        benefits: input.productBenefits,
        pain_points: input.productPainPoints,
      },
      offer: {
        headline: input.offerHeadline,
        details: input.offerDetails,
        cta: input.offerCta,
        guarantee: input.offerGuarantee,
        urgency: input.offerUrgency,
        bonus: input.offerBonus,
      },
      objective: input.objective,
      numVariants: input.numVariants,
    });
  } catch (err: any) {
    console.error("generate failed", err);
    return NextResponse.json(
      { error: err?.message || "AI generation failed" },
      { status: 500 },
    );
  }

  await supabase
    .from("profiles")
    .update({ monthly_generations_used: (profile?.monthly_generations_used ?? 0) + 1 })
    .eq("id", user.id);

  return NextResponse.json(result);
}
