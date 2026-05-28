import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionStatus } from "@/lib/types";

export const runtime = "nodejs";

const TRACKED: ReadonlyArray<SubscriptionStatus> = [
  "trialing", "active", "past_due", "canceled", "incomplete",
];

function mapStatus(status: string): SubscriptionStatus {
  return (TRACKED as readonly string[]).includes(status)
    ? (status as SubscriptionStatus)
    : "incomplete";
}

async function syncSubscription(sub: Stripe.Subscription) {
  const admin = createAdminClient();
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const { data: profile } = await admin
    .from("profiles").select("id").eq("stripe_customer_id", customerId).single();
  if (!profile) return;
  await admin.from("profiles").update({
    stripe_subscription_id: sub.id,
    subscription_status: mapStatus(sub.status),
  }).eq("id", profile.id);
}

async function applyWalletTopup(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const userId = typeof meta.user_id === "string" ? meta.user_id : null;
  const credit = Number(meta.credit_cents ?? 0);
  if (!userId || !Number.isFinite(credit) || credit <= 0) return;

  const admin = createAdminClient();

  // Idempotency: don't double-apply on webhook retries.
  const { data: existing } = await admin
    .from("wallet_transactions")
    .select("id").eq("reference", session.id).maybeSingle();
  if (existing) return;

  const { data: profile } = await admin
    .from("profiles").select("credit_cents").eq("id", userId).single();
  if (!profile) return;

  const newBalance = (profile.credit_cents ?? 0) + credit;
  await admin.from("profiles").update({ credit_cents: newBalance }).eq("id", userId);

  await admin.from("wallet_transactions").insert({
    user_id: userId,
    amount_cents: credit,
    kind: "topup",
    reference: session.id,
    description: `Wallet top-up · ${typeof meta.pack_id === "string" ? meta.pack_id : "pack"}`,
  });
}

async function upsertCFSubscription(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const userId = typeof meta.user_id === "string" ? meta.user_id : null;
  const subBrand = typeof meta.sub_brand === "string" ? meta.sub_brand : null;
  if (!userId || !subBrand) return;

  const admin = createAdminClient();
  const stripeSubId = typeof session.subscription === "string" ? session.subscription : null;

  await admin.from("cf_subscriptions").upsert({
    user_id: userId,
    sub_brand: subBrand,
    tier: typeof meta.tier === "string" ? meta.tier : null,
    status: stripeSubId ? "active" : "active", // one-time payments also flip active
    stripe_subscription_id: stripeSubId,
    stripe_price_id: null,                     // filled by syncCFSubscription on next event
    started_at: new Date().toISOString(),
  }, { onConflict: "user_id,sub_brand" });
}

async function syncCFSubscription(sub: Stripe.Subscription) {
  const meta = sub.metadata ?? {};
  const userId = typeof meta.user_id === "string" ? meta.user_id : null;
  const subBrand = typeof meta.sub_brand === "string" ? meta.sub_brand : null;
  if (!userId || !subBrand) return;

  const admin = createAdminClient();
  const priceId = sub.items?.data?.[0]?.price?.id ?? null;
  const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;

  await admin.from("cf_subscriptions").upsert({
    user_id: userId,
    sub_brand: subBrand,
    tier: typeof meta.tier === "string" ? meta.tier : null,
    status: mapStatus(sub.status),
    stripe_subscription_id: sub.id,
    stripe_price_id: priceId,
    current_period_end: periodEnd,
    ends_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
  }, { onConflict: "user_id,sub_brand" });
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const sig = request.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.kind === "wallet_topup") {
        await applyWalletTopup(session);
        break;
      }
      // CF module purchase (one-time or subscription).
      if (session.metadata?.sub_brand) {
        await upsertCFSubscription(session);
      }
      if (session.subscription) {
        const subId = typeof session.subscription === "string"
          ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await syncSubscription(sub);
        await syncCFSubscription(sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await syncSubscription(sub);
      await syncCFSubscription(sub);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
