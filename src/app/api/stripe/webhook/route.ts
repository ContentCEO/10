import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@supabase/ssr";
import { stripe } from "@/lib/stripe";

export const runtime = "nodejs";

function adminClient() {
  // Bypass RLS for webhook-driven updates.
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { get() { return undefined; }, set() {}, remove() {} } },
  );
}

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = adminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = (session.subscription_data as Stripe.Checkout.SessionCreateParams.SubscriptionData | undefined)?.metadata?.supabase_user_id
        ?? session.metadata?.supabase_user_id;
      if (userId && session.subscription) {
        await supabase.from("profiles").update({
          stripe_subscription_id: session.subscription as string,
          stripe_customer_id: (session.customer as string) ?? undefined,
          plan: "pro",
        }).eq("id", userId);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId = sub.metadata?.supabase_user_id;
      if (userId) {
        const plan = sub.status === "active" || sub.status === "trialing" ? "pro" : "free";
        await supabase.from("profiles").update({
          plan,
          stripe_subscription_id: sub.id,
        }).eq("id", userId);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
