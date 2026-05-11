import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  coerceBudget,
  coerceTimeline,
  insertMarketplaceLead,
} from "@/lib/lead-intake";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  // Honeypot — silently accept and drop.
  if (body?.website) return NextResponse.json({ ok: true });

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const service_type = typeof body?.service_type === "string" ? body.service_type.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!service_type) return NextResponse.json({ error: "Service is required" }, { status: 400 });

  const admin = createAdminClient();

  // Partner widget attribution (reverse marketplace).
  const partnerToken = typeof body?.partner_token === "string" ? body.partner_token : null;
  let partnerWidget: { id: string; user_id: string; credit_per_lead_cents: number } | null = null;
  if (partnerToken) {
    const { data } = await admin
      .from("partner_widgets")
      .select("id,user_id,credit_per_lead_cents")
      .eq("token", partnerToken).maybeSingle();
    if (data) partnerWidget = data as { id: string; user_id: string; credit_per_lead_cents: number };
  }

  const result = await insertMarketplaceLead(admin, {
    name,
    phone: typeof body?.phone === "string" ? body.phone || null : null,
    email: typeof body?.email === "string" ? body.email || null : null,
    city:  typeof body?.city  === "string" ? body.city  || null : null,
    zip:   typeof body?.zip   === "string" ? body.zip   || null : null,
    service_type,
    budget:   coerceBudget(body?.budget),
    timeline: coerceTimeline(body?.timeline),
    notes: typeof body?.notes === "string" ? body.notes || null : null,
    source_channel: "marketplace_form",
    raw_payload: body,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Credit the partner who delivered this lead.
  if (partnerWidget && !result.deduped) {
    await admin.from("marketplace_leads")
      .update({ partner_widget_id: partnerWidget.id })
      .eq("id", result.id);
    await admin.rpc("credit_wallet", {
      p_user_id: partnerWidget.user_id,
      p_amount: partnerWidget.credit_per_lead_cents,
    });
    await admin.from("wallet_transactions").insert({
      user_id: partnerWidget.user_id,
      amount_cents: partnerWidget.credit_per_lead_cents,
      kind: "topup",
      reference: result.id,
      description: "Partner widget lead credit",
    });
    await admin.from("partner_widgets").update({
      total_leads: 0, // overwritten below
    });
    // Counter increments via a select-then-update — keeps things simple.
    const { data: w } = await admin.from("partner_widgets")
      .select("total_leads,total_credit_cents").eq("id", partnerWidget.id).single();
    if (w) {
      await admin.from("partner_widgets").update({
        total_leads: (w.total_leads ?? 0) + 1,
        total_credit_cents: (w.total_credit_cents ?? 0) + partnerWidget.credit_per_lead_cents,
      }).eq("id", partnerWidget.id);
    }
  }

  // Log referral redemption if a code came through. The credit is applied
  // later when the lead actually closes (lead.status = 'won').
  const refCode = typeof body?.referral_code === "string" ? body.referral_code.trim() : "";
  if (refCode) {
    const { data: codeRow } = await admin
      .from("referral_codes").select("code,credit_cents,uses").eq("code", refCode).maybeSingle();
    if (codeRow) {
      await admin.from("referral_redemptions").insert({
        code: codeRow.code,
        referred_email: typeof body?.email === "string" ? body.email : null,
        credit_cents: codeRow.credit_cents,
      });
      await admin.from("referral_codes")
        .update({ uses: (codeRow.uses ?? 0) + 1 })
        .eq("code", refCode);
    }
  }
  return NextResponse.json({ ok: true });
}
