import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getPlan, legacyPriceId, planPriceId } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const plan = getPlan(typeof body?.plan === "string" ? body.plan : "");
  if (!plan) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

  let priceId = planPriceId(plan);
  // Backwards-compat: if you only have STRIPE_PRICE_ID configured, use it
  // for the Growth tier so the existing single-tier setup keeps working.
  if (!priceId && plan.id === "growth") priceId = legacyPriceId();

  if (!priceId) {
    return NextResponse.json({
      error: `Stripe price ID for ${plan.name} not configured (set ${plan.envKey})`,
    }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("profiles").select("stripe_customer_id").eq("id", user.id).single();

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles")
      .update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 14 },
    success_url: `${baseUrl}/billing?status=success`,
    cancel_url: `${baseUrl}/billing?status=cancelled`,
    allow_promotion_codes: true,
    metadata: { user_id: user.id, plan: plan.id },
  });

  return NextResponse.json({ url: session.url });
}
