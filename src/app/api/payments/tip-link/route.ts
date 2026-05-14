import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Plan 1 / E-20 — Tip jar Stripe link.
//
// POST /api/payments/tip-link
// Body: { amounts_cents?: number[] (default [10_00, 20_00, 50_00]), description?: string }
//
// Creates a Stripe Payment Link with 3 preset tip amounts. Customer
// picks one, pays in one click. Distinct from /api/payments/deposit-link
// which is a fixed amount for a specific job.

interface Body { amounts_cents?: number[]; description?: string }

const DEFAULT_AMOUNTS = [10_00, 20_00, 50_00];

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({
      error: "Stripe is not configured. Add STRIPE_SECRET_KEY to enable tip links.",
    }, { status: 503 });
  }

  const body = await request.json().catch(() => ({})) as Body;
  const amounts = (body.amounts_cents && body.amounts_cents.length > 0)
    ? body.amounts_cents.filter((n) => Number.isFinite(n) && n >= 100 && n <= 1_000_00).slice(0, 5)
    : DEFAULT_AMOUNTS;
  const description = (body.description ?? "Crew tip").trim().slice(0, 120);

  try {
    const stripe = getStripe();
    // Stripe Payment Links don't support customer-selectable quantity well
    // for tips. We create one link per amount and return all three so the
    // customer-facing page can present them as buttons.
    const links = await Promise.all(amounts.map((amt) =>
      stripe.paymentLinks.create({
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: amt,
            product_data: { name: `${description} · $${(amt / 100).toFixed(0)}` },
          },
          quantity: 1,
        }] as unknown as Parameters<typeof stripe.paymentLinks.create>[0]["line_items"],
        metadata: { contractorflow_user_id: user.id, kind: "tip", amount_cents: String(amt) },
        after_completion: { type: "hosted_confirmation" },
        payment_method_types: ["card"],
      })
    ));

    return NextResponse.json({
      ok: true,
      description,
      options: amounts.map((amt, i) => ({
        amount_cents: amt,
        label: `$${(amt / 100).toFixed(0)}`,
        url: links[i].url,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Stripe error" }, { status: 500 });
  }
}
