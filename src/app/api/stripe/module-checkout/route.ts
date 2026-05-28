import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CF_PRODUCTS, findProduct } from "@/lib/cf-products";

export const runtime = "nodejs";

interface Body {
  envKey?: string;
}

/*
 * Create a Stripe Checkout session for one of the CF module products.
 *
 * Body: { envKey: "STRIPE_PRICE_MARKETPLACE_STANDARD" }
 *
 * Returns { url } so the caller redirects to it.
 *
 * Sets metadata { sub_brand, tier, user_id, env_key } so the webhook
 * can insert the cf_subscriptions row on completion.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  const envKey = body.envKey ?? "";
  const product = findProduct(envKey);
  if (!product) {
    return NextResponse.json({ error: "Unknown product" }, { status: 400 });
  }
  const priceId = process.env[product.envKey];
  if (!priceId) {
    return NextResponse.json({
      error: `${product.envKey} is not configured on Vercel. Create the product in Stripe Dashboard and add the price ID as an env var.`,
    }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "")
                ?? `https://${req.headers.get("host") ?? "localhost:3000"}`;

  const admin = createAdminClient();
  // Look up or create the Stripe customer for this user.
  const { data: profile } = await admin
    .from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
  let customerId = (profile as { stripe_customer_id?: string } | null)?.stripe_customer_id ?? null;

  const stripe = getStripe();
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: product.recurring ? "subscription" : "payment",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/account/modules?status=success&module=${product.module}`,
    cancel_url:  `${baseUrl}/account/modules?status=cancelled`,
    allow_promotion_codes: true,
    metadata: {
      user_id: user.id,
      sub_brand: product.module,
      tier: product.tier,
      env_key: product.envKey,
    },
    subscription_data: product.recurring ? {
      metadata: {
        user_id: user.id,
        sub_brand: product.module,
        tier: product.tier,
        env_key: product.envKey,
      },
    } : undefined,
  });

  return NextResponse.json({ url: session.url });
}
