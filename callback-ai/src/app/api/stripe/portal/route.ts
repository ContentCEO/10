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

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.redirect(new URL("/dashboard/billing", env.SITE_URL));
  }

  const portal = await getStripe().billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${env.SITE_URL}/dashboard/billing`
  });
  return NextResponse.redirect(portal.url, { status: 303 });
}
