import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getProfile } from "@/lib/auth";

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!profile.stripe_customer_id) {
    return NextResponse.json({ error: "No billing account on file." }, { status: 400 });
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/portal/membership`
  });
  return NextResponse.json({ url: session.url });
}
