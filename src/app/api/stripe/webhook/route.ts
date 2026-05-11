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
      if (session.subscription) {
        const subId = typeof session.subscription === "string"
          ? session.subscription : session.subscription.id;
        const sub = await stripe.subscriptions.retrieve(subId);
        await syncSubscription(sub);
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
