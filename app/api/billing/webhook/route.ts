import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { planFromPriceId } from "@/lib/plans";

export const runtime = "nodejs";

async function setProfilePlanByCustomer(
  customerId: string,
  fields: Record<string, unknown>,
) {
  const admin = createServiceClient();
  await admin
    .from("profiles")
    .update(fields)
    .eq("stripe_customer_id", customerId);
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const stripe = getStripe();
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    return NextResponse.json({ error: `Bad signature: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string | null;
      if (!customerId) break;
      const subscriptionId = session.subscription as string | null;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items.data[0]?.price.id;
        await setProfilePlanByCustomer(customerId, {
          plan: planFromPriceId(priceId),
          stripe_subscription_id: sub.id,
        });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      const priceId = sub.items.data[0]?.price.id;
      const active = sub.status === "active" || sub.status === "trialing";
      await setProfilePlanByCustomer(customerId, {
        plan: active ? planFromPriceId(priceId) : "free",
        stripe_subscription_id: sub.id,
      });
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;
      await setProfilePlanByCustomer(customerId, {
        plan: "free",
        stripe_subscription_id: null,
      });
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
