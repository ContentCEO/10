import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Creative = z.object({
  variant_label: z.string(),
  angle: z.string(),
  headline: z.string(),
  primary_text: z.string(),
  description: z.string(),
  hook: z.string(),
  cta: z.string(),
  image_prompt: z.string(),
  video_script: z.string(),
});

const Input = z.object({
  businessId: z.string().uuid(),
  name: z.string().min(1),
  objective: z.string().optional().default("conversions"),
  product: z.object({
    name: z.string(),
    description: z.string().optional().default(""),
    price: z.string().optional().default(""),
    features: z.string().optional().default(""),
    benefits: z.string().optional().default(""),
    pain_points: z.string().optional().default(""),
  }),
  offer: z.object({
    headline: z.string(),
    details: z.string().optional().default(""),
    cta: z.string().optional().default(""),
    guarantee: z.string().optional().default(""),
    urgency: z.string().optional().default(""),
    bonus: z.string().optional().default(""),
  }),
  structure: z.any(),
  creatives: z.array(Creative),
});

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Input.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const data = parsed.data;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", data.businessId)
    .eq("user_id", user.id)
    .single();
  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const { data: product, error: pErr } = await supabase
    .from("products")
    .insert({
      business_id: business.id,
      user_id: user.id,
      name: data.product.name,
      description: data.product.description,
      price: data.product.price,
      features: data.product.features,
      benefits: data.product.benefits,
      pain_points: data.product.pain_points,
    })
    .select()
    .single();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const { data: offer, error: oErr } = await supabase
    .from("offers")
    .insert({
      product_id: product.id,
      user_id: user.id,
      headline: data.offer.headline,
      details: data.offer.details,
      cta: data.offer.cta,
      guarantee: data.offer.guarantee,
      urgency: data.offer.urgency,
      bonus: data.offer.bonus,
    })
    .select()
    .single();
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 });

  const { data: campaign, error: cErr } = await supabase
    .from("campaigns")
    .insert({
      user_id: user.id,
      business_id: business.id,
      product_id: product.id,
      offer_id: offer.id,
      name: data.name,
      objective: data.objective,
      platform: "meta",
      structure: data.structure,
    })
    .select()
    .single();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

  const creativeRows = data.creatives.map((c) => ({
    campaign_id: campaign.id,
    user_id: user.id,
    ...c,
  }));
  const { error: crErr } = await supabase.from("ad_creatives").insert(creativeRows);
  if (crErr) return NextResponse.json({ error: crErr.message }, { status: 500 });

  return NextResponse.json({ campaign });
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("campaigns")
    .select("id, name, objective, platform, created_at, business_id, product_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ campaigns: data });
}
