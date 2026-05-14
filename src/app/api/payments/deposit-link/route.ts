import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Plan 1 / Section E / Idea #3 — Stripe deposit-link generator.
//
// POST /api/payments/deposit-link
// Body: { amount_cents: number, description: string, customer_email?: string, lead_id?: string }
//
// Creates a one-time Stripe Payment Link using an inline price + product.
// Returns the URL — share it via SMS/email; the customer pays in one click.
//
// No Stripe Connect needed for the v1 — payments land in the contractor's
// Stripe account that owns STRIPE_SECRET_KEY. A future expansion can route
// to per-contractor connected accounts.

interface Body {
  amount_cents?: number;
  description?: string;
  customer_email?: string;
  lead_id?: string;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const amount = Number(body.amount_cents);
  if (!Number.isFinite(amount) || amount < 100 || amount > 100_000_00) {
    return NextResponse.json({ error: "amount_cents must be between 100 and 10,000,000" }, { status: 400 });
  }
  const description = (body.description ?? "").trim().slice(0, 200);
  if (!description) {
    return NextResponse.json({ error: "description is required" }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      error: "Stripe is not configured. Add STRIPE_SECRET_KEY to your environment to enable deposit links.",
    }, { status: 503 });
  }

  try {
    const stripe = getStripe();

    // Inline price (no need to create a Product up front for one-off links).
    const link = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: { name: description },
          },
          quantity: 1,
        },
      ] as unknown as Parameters<typeof stripe.paymentLinks.create>[0]["line_items"],
      metadata: {
        contractorflow_user_id: user.id,
        lead_id: body.lead_id ?? "",
        customer_email: body.customer_email ?? "",
      },
      after_completion: { type: "hosted_confirmation" },
      payment_method_types: ["card"],
    });

    return NextResponse.json({
      ok: true,
      url: link.url,
      id: link.id,
      amount_cents: amount,
      description,
    });
  } catch (e) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : "Stripe error",
    }, { status: 500 });
  }
}
