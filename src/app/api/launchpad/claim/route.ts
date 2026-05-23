// Public endpoint: a prospect clicks "Claim this site" on their preview page,
// hits this route, and gets redirected to a Stripe Checkout session for one
// of the three Launchpad tiers.
//
// Per the Contractor Flow architecture brief (Section 7), each tier maps to
// dedicated Stripe products:
//   - cf_launchpad_foundation                     (one-time)
//   - cf_launchpad_foundation_growth_setup        (one-time)
//   - cf_launchpad_foundation_growth_monthly      (recurring)
//   - cf_launchpad_revenue_share_setup            (one-time)
//   - cf_launchpad_revenue_share_monthly          (recurring)
// The 8% rev-share line item (cf_launchpad_revenue_share_8pct) is invoiced
// monthly out-of-band via CF CRM attribution + Stripe — not part of checkout.

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type { Plan } from "@/lib/launchpad/types";

export const dynamic = "force-dynamic";

interface TierConfig {
  mode: "payment" | "subscription";
  prices: (string | undefined)[];
}

function tierConfig(plan: Plan): TierConfig {
  switch (plan) {
    case "foundation":
      return {
        mode: "payment",
        prices: [process.env.STRIPE_PRICE_CF_LAUNCHPAD_FOUNDATION],
      };
    case "foundation_growth":
      return {
        mode: "subscription",
        prices: [
          process.env.STRIPE_PRICE_CF_LAUNCHPAD_FOUNDATION_GROWTH_SETUP,
          process.env.STRIPE_PRICE_CF_LAUNCHPAD_FOUNDATION_GROWTH_MONTHLY,
        ],
      };
    case "revenue_share":
      return {
        mode: "subscription",
        prices: [
          process.env.STRIPE_PRICE_CF_LAUNCHPAD_REVENUE_SHARE_SETUP,
          process.env.STRIPE_PRICE_CF_LAUNCHPAD_REVENUE_SHARE_MONTHLY,
        ],
      };
  }
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { slug?: string; plan?: Plan; email?: string };
  if (!body.slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const plan: Plan = body.plan ?? "foundation_growth";
  const cfg = tierConfig(plan);
  if (cfg.prices.some((p) => !p)) {
    return NextResponse.json(
      { error: `Stripe prices not configured for '${plan}'. Set STRIPE_PRICE_CF_LAUNCHPAD_* env vars.` },
      { status: 500 },
    );
  }

  const supabase = createAdminClient();
  const { data: site, error } = await supabase
    .from("cf_launchpad_sites").select("id, slug, prospect_id").eq("slug", body.slug).single();
  if (error || !site) return NextResponse.json({ error: "site not found" }, { status: 404 });

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: cfg.mode,
    line_items: cfg.prices.map((priceId) => ({ price: priceId as string, quantity: 1 })),
    success_url: `${appUrl}/preview/sites/${site.slug}/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appUrl}/preview/sites/${site.slug}`,
    customer_email: body.email,
    metadata: {
      cf_launchpad_prospect_id: site.prospect_id,
      cf_launchpad_site_id: site.id,
      cf_launchpad_slug: site.slug,
      cf_launchpad_plan: plan,
    },
    // Subscription mode also needs subscription_data metadata so the webhook
    // can match an incoming invoice.paid event back to the prospect later.
    ...(cfg.mode === "subscription" && {
      subscription_data: {
        metadata: {
          cf_launchpad_prospect_id: site.prospect_id,
          cf_launchpad_slug: site.slug,
          cf_launchpad_plan: plan,
        },
      } satisfies Stripe.Checkout.SessionCreateParams.SubscriptionData,
    }),
  });

  await supabase.from("cf_launchpad_subscriptions").insert({
    prospect_id: site.prospect_id,
    plan,
    status: "pending",
    stripe_session_id: session.id,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
