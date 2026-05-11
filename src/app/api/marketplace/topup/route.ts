import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getPack } from "@/lib/wallet";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const pack = getPack(typeof body?.pack === "string" ? body.pack : "");
  if (!pack) return NextResponse.json({ error: "Unknown pack" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let customerId = profile?.stripe_customer_id ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles")
      .update({ stripe_customer_id: customerId }).eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: pack.price_cents,
        product_data: {
          name: `ContractorFlow credit — ${pack.label}`,
          description: pack.bonus > 0
            ? `${pack.label} of credit plus a $${(pack.bonus / 100).toFixed(0)} bonus`
            : `${pack.label} of marketplace credit`,
        },
      },
    }],
    success_url: `${baseUrl}/marketplace?topup=success`,
    cancel_url: `${baseUrl}/marketplace?topup=cancelled`,
    metadata: {
      kind: "wallet_topup",
      user_id: user.id,
      pack_id: pack.id,
      credit_cents: String(pack.credit_cents),
    },
  });

  return NextResponse.json({ url: session.url });
}
