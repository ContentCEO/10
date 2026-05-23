// Public endpoint: a prospect clicks "Claim this site" on their preview page,
// hits this route, and gets redirected to a Stripe Checkout session.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type { Plan } from "@/lib/auto-outreach/types";

export const dynamic = "force-dynamic";

const PRICE_BY_PLAN: Record<Plan, string | undefined> = {
  one_time:      process.env.STRIPE_PRICE_OUTREACH_ONETIME,
  monthly:       process.env.STRIPE_PRICE_OUTREACH_MONTHLY,
  ad_management: process.env.STRIPE_PRICE_OUTREACH_ADMGMT,
};

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { slug?: string; plan?: Plan; email?: string };
  if (!body.slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const plan: Plan = body.plan && PRICE_BY_PLAN[body.plan] ? body.plan : "one_time";
  const priceId = PRICE_BY_PLAN[plan];
  if (!priceId) {
    return NextResponse.json({ error: `No Stripe price configured for plan '${plan}'` }, { status: 500 });
  }

  const supabase = createAdminClient();
  const { data: site, error } = await supabase
    .from("ao_sites").select("id, slug, prospect_id").eq("slug", body.slug).single();
  if (error || !site) return NextResponse.json({ error: "site not found" }, { status: 404 });

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: plan === "one_time" ? "payment" : "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/sites/${site.slug}/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${appUrl}/sites/${site.slug}`,
    customer_email: body.email,
    metadata: {
      ao_prospect_id: site.prospect_id,
      ao_site_id: site.id,
      ao_slug: site.slug,
      ao_plan: plan,
    },
  });

  await supabase.from("ao_subscriptions").insert({
    prospect_id: site.prospect_id,
    plan,
    status: "pending",
    stripe_session_id: session.id,
  });

  return NextResponse.json({ ok: true, url: session.url });
}
