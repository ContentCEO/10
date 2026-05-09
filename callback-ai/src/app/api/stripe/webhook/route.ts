import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not set" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[stripe] webhook signature failed:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const db = createSupabaseServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        if (userId && session.subscription) {
          await db.from("subscriptions").upsert({
            owner_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            status: "active"
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .from("subscriptions")
          .update({
            stripe_subscription_id: sub.id,
            price_id: sub.items.data[0]?.price.id,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString()
          })
          .eq("stripe_customer_id", sub.customer as string);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe] webhook handler error:", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
