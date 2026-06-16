import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Customer Portal session — manage card, change plan, cancel, see invoices.
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("marketplace_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const customerId = (sub as { stripe_customer_id?: string } | null)?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json(
      { error: "No subscription yet — start one first" },
      { status: 400 },
    );
  }

  const origin =
    request.headers.get("origin") ??
    "https://marketplace.contractorflowstore.com";

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer:    customerId,
    return_url:  `${origin}/account`,
  });

  return NextResponse.json({ url: session.url });
}
