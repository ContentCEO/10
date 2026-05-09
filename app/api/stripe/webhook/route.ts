import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json(
      { error: "Missing stripe signature or webhook secret" },
      { status: 400 },
    );
  }

  const stripe = getStripe();
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const admin = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const obj = event.data.object as
        | Stripe.Checkout.Session
        | Stripe.Subscription;
      const userId =
        (obj as Stripe.Subscription).metadata?.user_id ??
        ((obj as Stripe.Checkout.Session).metadata?.user_id as
          | string
          | undefined);
      if (userId) {
        await admin
          .from("profiles")
          .update({ plan: "pro" })
          .eq("id", userId);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.user_id;
      if (userId) {
        await admin
          .from("profiles")
          .update({ plan: "free" })
          .eq("id", userId);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
