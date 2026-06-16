import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { getTier } from "@/lib/marketplace-tiers";

export const runtime = "nodejs";

// POST /api/leads/claim  body: { lead_id }
// Atomic-ish flow:
//   1. Verify contractor has an active subscription
//   2. Verify lead is still available + matches preferences
//   3. If included quota remaining → decrement, no charge
//   4. Otherwise → bill overage as Stripe invoice item at tier rate
//   5. Mark lead claimed (lock to this buyer)
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { lead_id } = await request.json().catch(() => ({})) as { lead_id?: string };
  if (!lead_id) {
    return NextResponse.json({ error: "lead_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Subscription check
  const { data: subRow } = await admin
    .from("marketplace_subscriptions")
    .select("tier,status,leads_used_this_period,stripe_subscription_id,stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const sub = subRow as {
    tier: string | null;
    status: string;
    leads_used_this_period: number;
    stripe_subscription_id: string | null;
    stripe_customer_id: string | null;
  } | null;

  if (!sub || !["trialing", "active"].includes(sub.status) || !sub.tier) {
    return NextResponse.json(
      { error: "No active Marketplace subscription. Pick a plan to start claiming leads." },
      { status: 402 },
    );
  }

  const tier = getTier(sub.tier);
  if (!tier) {
    return NextResponse.json({ error: "Unknown tier on subscription" }, { status: 500 });
  }

  // 2. Lead check
  const { data: leadRow } = await admin
    .from("marketplace_leads")
    .select("id,status,buyer_id")
    .eq("id", lead_id)
    .maybeSingle();

  const lead = leadRow as { id: string; status: string; buyer_id: string | null } | null;
  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
  if (lead.status !== "available" || lead.buyer_id) {
    return NextResponse.json({ error: "Already claimed by another contractor" }, { status: 409 });
  }

  // 3. Decide: included quota OR overage
  const withinIncluded = sub.leads_used_this_period < tier.includedLeads;
  let overage_cents = 0;

  if (!withinIncluded) {
    // 4. Bill overage as a one-off invoice item attached to next period.
    if (!sub.stripe_customer_id) {
      return NextResponse.json(
        { error: "Billing not fully configured — manage subscription first" },
        { status: 500 },
      );
    }
    try {
      const stripe = getStripe();
      await stripe.invoiceItems.create({
        customer:    sub.stripe_customer_id,
        amount:      tier.overagePerLeadCents,
        currency:    "usd",
        description: `Marketplace lead overage (${tier.name} tier) — lead ${lead_id.slice(0, 8)}`,
        metadata:    { lead_id, user_id: user.id, tier: tier.slug, kind: "overage" },
      });
      overage_cents = tier.overagePerLeadCents;
    } catch (err) {
      return NextResponse.json(
        { error: `Overage billing failed: ${err instanceof Error ? err.message : "unknown"}` },
        { status: 502 },
      );
    }
  }

  // 5. Mark claimed atomically (only if still available)
  const { data: claimed, error: claimErr } = await admin
    .from("marketplace_leads")
    .update({
      status:      "claimed",
      buyer_id:    user.id,
      bought_at:   new Date().toISOString(),
      price_cents: overage_cents,
    })
    .eq("id", lead_id)
    .eq("status", "available")
    .is("buyer_id", null)
    .select("id")
    .maybeSingle();

  if (claimErr || !claimed) {
    return NextResponse.json({ error: "Race lost — another contractor claimed it" }, { status: 409 });
  }

  // 6. Decrement counter (only if within included quota)
  if (withinIncluded) {
    await admin.from("marketplace_subscriptions")
      .update({ leads_used_this_period: sub.leads_used_this_period + 1 })
      .eq("user_id", user.id);
  }

  return NextResponse.json({
    ok:           true,
    lead_id,
    charged:      !withinIncluded,
    overage_cents,
    remaining:    Math.max(0, tier.includedLeads - sub.leads_used_this_period - (withinIncluded ? 1 : 0)),
  });
}
