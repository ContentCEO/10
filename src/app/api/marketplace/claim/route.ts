import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();

  // Only contractor accounts can claim leads.
  const { data: buyerProfile } = await admin
    .from("profiles").select("account_type").eq("id", user.id).single();
  if (buyerProfile?.account_type !== "contractor") {
    return NextResponse.json(
      { error: "Only contractor accounts can claim leads." },
      { status: 403 },
    );
  }

  // Look up the lead + price before debiting so we know the cost.
  const { data: lead } = await admin
    .from("marketplace_leads")
    .select("*").eq("id", id).single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.status !== "available") {
    return NextResponse.json({ error: "Lead already claimed" }, { status: 409 });
  }

  // Atomically check + debit balance.
  const { data: debited, error: debitErr } = await admin.rpc("debit_wallet", {
    p_user_id: user.id,
    p_amount: lead.price_cents,
  });
  if (debitErr) {
    return NextResponse.json({ error: debitErr.message }, { status: 500 });
  }
  if (!debited) {
    return NextResponse.json({
      error: "INSUFFICIENT_CREDIT",
      message: "Not enough credit. Top up your wallet to claim this lead.",
      required_cents: lead.price_cents,
    }, { status: 402 });
  }

  // Mark the lead sold (still racy if two claims hit at the same instant — recover
  // by refunding the wallet if the marketplace update lost the race).
  const { data: claimed, error: claimErr } = await admin
    .from("marketplace_leads")
    .update({
      status: "sold",
      buyer_id: user.id,
      bought_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "available")
    .select("*").single();

  if (claimErr || !claimed) {
    // Refund the debit.
    const { data: profile } = await admin
      .from("profiles").select("credit_cents").eq("id", user.id).single();
    if (profile) {
      await admin.from("profiles")
        .update({ credit_cents: (profile.credit_cents ?? 0) + lead.price_cents })
        .eq("id", user.id);
      await admin.from("wallet_transactions").insert({
        user_id: user.id,
        amount_cents: lead.price_cents,
        kind: "refund",
        reference: lead.id,
        description: "Auto-refund: lead claimed by another buyer first",
      });
    }
    return NextResponse.json(
      { error: "Lead already claimed by another buyer — your credit was refunded" },
      { status: 409 },
    );
  }

  // Log the claim charge.
  await admin.from("wallet_transactions").insert({
    user_id: user.id,
    amount_cents: -lead.price_cents,
    kind: "claim",
    reference: claimed.id,
    description: `Claimed: ${claimed.service_type}`,
  });

  // Drop the lead into the buyer's pipeline.
  const locationLine =
    claimed.city || claimed.zip
      ? `Location: ${[claimed.city, claimed.zip].filter(Boolean).join(", ")}`
      : null;
  const { data: pipelineLead, error: leadErr } = await admin
    .from("leads")
    .insert({
      user_id: user.id,
      name: claimed.name,
      phone: claimed.phone,
      email: claimed.email,
      service_type: claimed.service_type,
      source: "Marketplace",
      estimated_value: null,
      status: "new",
      notes: [claimed.ai_summary, claimed.notes, locationLine]
        .filter(Boolean).join("\n\n") || null,
    })
    .select("id").single();

  if (leadErr || !pipelineLead) {
    return NextResponse.json(
      { error: leadErr?.message ?? "Could not add to pipeline" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, leadId: pipelineLead.id });
}
