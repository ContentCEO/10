import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripe } from "@/lib/stripe";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

const Body = z.object({ plan_id: z.string().uuid() });

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const json = await request.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan." }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", parsed.data.plan_id)
    .eq("active", true)
    .single();

  if (!plan?.stripe_price_id) {
    return NextResponse.json(
      { error: "This plan is missing a Stripe price ID. Add one in Admin → Plans." },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const admin = createSupabaseAdminClient();

  let stripeCustomerId = profile.stripe_customer_id;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: profile.full_name ?? undefined,
      metadata: { profile_id: profile.id }
    });
    stripeCustomerId = customer.id;
    await admin.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", profile.id);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: stripeCustomerId,
    line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
    success_url: `${appUrl}/portal/membership?success=1`,
    cancel_url: `${appUrl}/portal/membership?canceled=1`,
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { profile_id: profile.id, plan_id: plan.id }
    },
    metadata: { profile_id: profile.id, plan_id: plan.id }
  });

  return NextResponse.json({ url: session.url });
}
