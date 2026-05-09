import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const key = process.env.STRIPE_SECRET_KEY;
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !secret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }
  const stripe = new Stripe(key);

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  switch (event.type) {
    case "checkout.session.completed":
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const obj = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
      const customerId = typeof obj.customer === "string" ? obj.customer : obj.customer?.id;
      if (customerId) {
        await supabase
          .from("workspaces")
          .update({ plan: "pro" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
      if (customerId) {
        await supabase
          .from("workspaces")
          .update({ plan: "free" })
          .eq("stripe_customer_id", customerId);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
