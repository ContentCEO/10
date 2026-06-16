import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getTierByPriceId } from "@/lib/marketplace-tiers";

export const runtime = "nodejs";
export const maxDuration = 30;

const RELEVANT_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

export async function POST(request: Request) {
  const sig = headers().get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return new NextResponse("Webhook not configured", { status: 400 });
  }

  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    return new NextResponse(
      `Webhook Error: ${err instanceof Error ? err.message : "invalid signature"}`,
      { status: 400 },
    );
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await onSubscriptionChange(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await onInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error(`[stripe.webhook] ${event.type} failed`, err);
    return new NextResponse(
      `Handler error: ${err instanceof Error ? err.message : "unknown"}`,
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId    = session.metadata?.user_id    ?? session.client_reference_id;
  const tierSlug  = session.metadata?.tier;
  const subId     = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const customer  = typeof session.customer     === "string" ? session.customer     : session.customer?.id;

  if (!userId || !tierSlug || !subId || !customer) return;

  // We let the subscription.created / updated event do the row write since it
  // carries authoritative period dates. But we attach the customer + tier ASAP
  // so the user lands on /dashboard with billing context.
  const admin = createAdminClient();
  await admin.from("marketplace_subscriptions").upsert({
    user_id:               userId,
    tier:                  tierSlug,
    stripe_subscription_id: subId,
    stripe_customer_id:     customer,
    status:                 "active",
  }, { onConflict: "user_id" });
}

async function onSubscriptionChange(sub: Stripe.Subscription) {
  const userId = sub.metadata?.user_id;
  if (!userId) return;
  const priceId = sub.items.data[0]?.price.id ?? null;
  const tier    = priceId ? getTierByPriceId(priceId) : null;

  const admin = createAdminClient();
  await admin.from("marketplace_subscriptions").upsert({
    user_id:                userId,
    stripe_subscription_id: sub.id,
    stripe_customer_id:     typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    tier:                   tier?.slug ?? sub.metadata?.tier ?? null,
    status:                 sub.status,
    current_period_start:   sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
    current_period_end:     sub.current_period_end   ? new Date(sub.current_period_end   * 1000).toISOString() : null,
    cancel_at_period_end:   sub.cancel_at_period_end,
  }, { onConflict: "user_id" });
}

async function onSubscriptionDeleted(sub: Stripe.Subscription) {
  const userId = sub.metadata?.user_id;
  if (!userId) return;
  const admin = createAdminClient();
  await admin.from("marketplace_subscriptions").update({
    status: "canceled",
  }).eq("user_id", userId);
}

async function onInvoicePaid(invoice: Stripe.Invoice) {
  // Period rolled → reset the used-leads counter for this contractor.
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subId) return;
  const admin = createAdminClient();
  await admin.from("marketplace_subscriptions").update({
    leads_used_this_period: 0,
    last_period_started_at: new Date().toISOString(),
  }).eq("stripe_subscription_id", subId);
}

async function onInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subId) return;
  const admin = createAdminClient();
  await admin.from("marketplace_subscriptions").update({
    status: "past_due",
  }).eq("stripe_subscription_id", subId);
}
