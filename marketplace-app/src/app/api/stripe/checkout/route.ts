import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getTier } from "@/lib/marketplace-tiers";

export const runtime = "nodejs";

// Creates a Stripe Checkout session for one of the 3 marketplace tiers.
// POST /api/stripe/checkout  body: { tier: "starter" | "growth" | "pro" }
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({})) as { tier?: string };
  const tier = getTier(String(body.tier ?? ""));
  if (!tier) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const priceId = process.env[tier.envKey];
  if (!priceId) {
    return NextResponse.json(
      { error: `Pricing not configured (${tier.envKey} missing)` },
      { status: 500 },
    );
  }

  const origin =
    request.headers.get("origin") ??
    `https://marketplace.contractorflowstore.com`;

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: {
      user_id: user.id,
      tier:    tier.slug,
      module:  "cf-marketplace",
    },
    subscription_data: {
      metadata: {
        user_id: user.id,
        tier:    tier.slug,
        module:  "cf-marketplace",
      },
      trial_period_days: 7,
    },
    success_url: `${origin}/account?checkout=success&tier=${tier.slug}`,
    cancel_url:  `${origin}/account?checkout=cancelled`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url, id: session.id });
}
