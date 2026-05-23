// Stripe webhook for Launchpad claim checkouts. Marks the subscription
// active and the prospect 'converted' so the dashboard reflects revenue.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const stripe = getStripe();
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "bad signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Only handle events that carry our cf_launchpad metadata.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata ?? {};
    if (!meta.cf_launchpad_prospect_id) return NextResponse.json({ received: true });

    const supabase = createAdminClient();
    const amount =
      (session.amount_total ?? session.amount_subtotal ?? null);

    await supabase
      .from("cf_launchpad_subscriptions")
      .update({
        status: "active",
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
        amount_cents: amount,
        currency: session.currency ?? "usd",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_session_id", session.id);

    await supabase
      .from("cf_launchpad_prospects")
      .update({
        outreach_status: "converted",
        claimed_at: new Date().toISOString(),
      })
      .eq("id", meta.cf_launchpad_prospect_id);
  }

  return NextResponse.json({ received: true });
}
