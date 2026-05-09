import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }
  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  async function profileFromCustomer(customerId: string | Stripe.Customer | Stripe.DeletedCustomer | null) {
    if (!customerId) return null;
    const id = typeof customerId === "string" ? customerId : customerId.id;
    const { data } = await supabase.from("profiles").select("id").eq("stripe_customer_id", id).single();
    return data?.id ?? null;
  }

  async function planIdFromPrice(priceId: string | undefined | null) {
    if (!priceId) return null;
    const { data } = await supabase.from("plans").select("id").eq("stripe_price_id", priceId).single();
    return data?.id ?? null;
  }

  async function upsertSubscription(sub: Stripe.Subscription) {
    const customerId = await profileFromCustomer(sub.customer);
    if (!customerId) return;
    const priceId = sub.items.data[0]?.price?.id;
    const planId = await planIdFromPrice(priceId);

    await supabase
      .from("subscriptions")
      .upsert(
        {
          customer_id: customerId,
          plan_id: planId,
          stripe_subscription_id: sub.id,
          status: sub.status as any,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end
        },
        { onConflict: "stripe_subscription_id" }
      );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertSubscription(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const customerId = await profileFromCustomer(inv.customer);
        if (!customerId) break;

        let subscriptionRowId: string | null = null;
        if (inv.subscription) {
          const { data } = await supabase
            .from("subscriptions")
            .select("id")
            .eq("stripe_subscription_id", inv.subscription as string)
            .single();
          subscriptionRowId = data?.id ?? null;
        }

        await supabase.from("payments").insert({
          customer_id: customerId,
          subscription_id: subscriptionRowId,
          amount_cents: inv.amount_paid || inv.amount_due || 0,
          currency: inv.currency || "usd",
          status: event.type === "invoice.paid" ? "succeeded" : "failed",
          stripe_invoice_id: inv.id,
          stripe_payment_intent_id: (inv.payment_intent as string) ?? null,
          description: inv.lines.data[0]?.description ?? "Subscription invoice",
          paid_at: event.type === "invoice.paid" ? new Date().toISOString() : null
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] handler error", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
