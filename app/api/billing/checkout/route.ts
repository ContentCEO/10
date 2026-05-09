import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

const Input = z.object({
  plan: z.enum(["starter", "pro"]),
});

function priceIdForPlan(plan: "starter" | "pro"): string | undefined {
  return plan === "starter"
    ? process.env.STRIPE_PRICE_STARTER
    : process.env.STRIPE_PRICE_PRO;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = Input.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

  const priceId = priceIdForPlan(parsed.data.plan);
  if (!priceId) {
    return NextResponse.json({ error: "Plan price not configured" }, { status: 500 });
  }

  let stripe;
  try {
    stripe = getStripe();
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? profile?.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/billing?success=1`,
    cancel_url: `${baseUrl}/billing?canceled=1`,
    allow_promotion_codes: true,
    metadata: { supabase_user_id: user.id, plan: parsed.data.plan },
  });

  return NextResponse.json({ url: session.url });
}
