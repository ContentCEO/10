import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireOrg } from "@/lib/auth";
import { getStripe, PLANS, type PlanKey } from "@/lib/stripe";

export const runtime = "nodejs";

const Body = z.object({
  plan: z.enum(["starter", "pro"]),
});

export async function POST(req: NextRequest) {
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { user, org, supabase } = await requireOrg();
  const plan: PlanKey = parsed.plan;
  const priceId = process.env[PLANS[plan].priceEnv];
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing Stripe price ID env: ${PLANS[plan].priceEnv}` },
      { status: 500 },
    );
  }

  const stripe = getStripe();

  // Create or reuse Stripe customer.
  let customerId = org.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: org.name,
      metadata: { org_id: org.id, user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("organizations")
      .update({ stripe_customer_id: customerId })
      .eq("id", org.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?status=success`,
    cancel_url: `${appUrl}/billing?status=canceled`,
    client_reference_id: org.id,
    metadata: { org_id: org.id, plan },
  });

  return NextResponse.json({ url: session.url });
}
