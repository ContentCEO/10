import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export async function POST() {
  const key = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
  if (!key || !priceId) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = new Stripe(key);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  let customerId = ws.stripe_customer_id ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { workspace_id: ws.id },
    });
    customerId = customer.id;
    await supabase.from("workspaces").update({ stripe_customer_id: customerId }).eq("id", ws.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/settings?billing=success`,
    cancel_url: `${appUrl}/settings?billing=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
