import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const VALID_REASONS = new Set([
  "wrong_number", "duplicate", "out_of_area", "spam",
  "wrong_service", "unreachable", "not_a_real_lead", "other",
]);

// Auto-refund rules — buyer-friendly defaults that match Angi/HomeAdvisor.
// Disputes for these reasons auto-resolve with full refund within ~24h:
const AUTO_REFUND_REASONS = new Set([
  "wrong_number", "duplicate", "out_of_area", "spam", "wrong_service",
]);

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const marketplaceLeadId = typeof body?.marketplace_lead_id === "string" ? body.marketplace_lead_id : "";
  const reason = typeof body?.reason === "string" ? body.reason : "";
  const details = typeof body?.details === "string" ? body.details : "";

  if (!marketplaceLeadId) return NextResponse.json({ error: "marketplace_lead_id required" }, { status: 400 });
  if (!VALID_REASONS.has(reason)) return NextResponse.json({ error: "Invalid reason" }, { status: 400 });

  const admin = createAdminClient();

  // Confirm the user actually bought this lead.
  const { data: lead } = await admin
    .from("marketplace_leads").select("id,buyer_id,price_cents,bought_at,status")
    .eq("id", marketplaceLeadId).single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (lead.buyer_id !== user.id) return NextResponse.json({ error: "You did not purchase this lead" }, { status: 403 });
  if (lead.status !== "sold") return NextResponse.json({ error: "Only sold leads are eligible" }, { status: 400 });

  // 30-day refund window.
  if (lead.bought_at && new Date(lead.bought_at).getTime() < Date.now() - 30 * 86_400_000) {
    return NextResponse.json({ error: "Refund window expired (30 days)" }, { status: 400 });
  }

  // Prevent duplicate disputes.
  const { data: existing } = await admin
    .from("lead_disputes").select("id")
    .eq("buyer_id", user.id).eq("marketplace_lead_id", marketplaceLeadId).maybeSingle();
  if (existing) return NextResponse.json({ error: "You already disputed this lead" }, { status: 409 });

  const autoRefund = AUTO_REFUND_REASONS.has(reason);
  const refundCents = autoRefund ? lead.price_cents : 0;

  const { data: dispute, error } = await admin.from("lead_disputes").insert({
    buyer_id: user.id,
    marketplace_lead_id: marketplaceLeadId,
    reason,
    details: details || null,
    status: autoRefund ? "resolved_refund" : "open",
    refund_cents: refundCents,
    resolved_at: autoRefund ? new Date().toISOString() : null,
  }).select("id").single();
  if (error || !dispute) {
    return NextResponse.json({ error: error?.message ?? "Failed to create dispute" }, { status: 500 });
  }

  if (autoRefund) {
    // Credit the buyer's wallet via the credit_wallet RPC.
    await admin.rpc("credit_wallet", { p_user_id: user.id, p_amount: refundCents });
    await admin.from("wallet_transactions").insert({
      user_id: user.id,
      amount_cents: refundCents,
      kind: "refund",
      reference: marketplaceLeadId,
      description: `Auto-refund: ${reason}`,
    });
  }

  return NextResponse.json({
    ok: true,
    dispute_id: dispute.id,
    auto_refunded: autoRefund,
    refund_cents: refundCents,
  });
}
