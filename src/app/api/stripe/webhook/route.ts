import { NextResponse } from "next/server";
import Stripe from "stripe";
import { env, isStripeConfigured, isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!isStripeConfigured) return new NextResponse("not configured", { status: 400 });
  const stripe = new Stripe(env.stripeSecret);
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = env.stripeWebhookSecret && sig
      ? stripe.webhooks.constructEvent(body, sig, env.stripeWebhookSecret)
      : (JSON.parse(body) as Stripe.Event);
  } catch (err) {
    return new NextResponse(`webhook error: ${(err as Error).message}`, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const obj = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
    const userId =
      "metadata" in obj && obj.metadata?.user_id
        ? obj.metadata.user_id
        : null;
    if (userId && isSupabaseConfigured) {
      const admin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);
      await admin.from("subscriptions").upsert({
        user_id: userId,
        stripe_customer_id: "customer" in obj ? (obj.customer as string) ?? null : null,
        stripe_subscription_id:
          "subscription" in obj ? (obj.subscription as string) ?? null : "id" in obj ? obj.id : null,
        status: "status" in obj ? (obj.status as string) : "active",
        plan: "pro",
        updated_at: new Date().toISOString(),
      });
    }
  }

  return NextResponse.json({ received: true });
}
