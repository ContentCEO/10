import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env, isStripeConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  if (!isStripeConfigured) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }
  const stripe = new Stripe(env.stripeSecret);
  const user = await getCurrentUser();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: env.stripePriceId, quantity: 1 }],
    customer_email: user?.email ?? undefined,
    success_url: `${env.appUrl}/dashboard/billing?status=success`,
    cancel_url: `${env.appUrl}/dashboard/billing?status=cancelled`,
    metadata: { user_id: user?.id ?? "" },
  });

  return NextResponse.json({ url: session.url });
}
