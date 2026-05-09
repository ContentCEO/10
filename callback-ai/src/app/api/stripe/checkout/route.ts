import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", env.SITE_URL));

  if (!env.STRIPE_PRICE_ID) {
    return NextResponse.json({ error: "STRIPE_PRICE_ID not configured" }, { status: 500 });
  }

  const stripe = getStripe();

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  let customerId = existing?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_user_id: user.id }
    });
    customerId = customer.id;
    await supabase
      .from("subscriptions")
      .upsert({ owner_id: user.id, stripe_customer_id: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: `${env.SITE_URL}/dashboard/billing?status=success`,
    cancel_url: `${env.SITE_URL}/dashboard/billing?status=cancelled`,
    metadata: { supabase_user_id: user.id }
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
