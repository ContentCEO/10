import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scheduleLeadFollowUps } from "@/lib/follow-up-sequence";
import { alertContractorOnLead } from "@/lib/alerts";

export const runtime = "nodejs";

// Auto-bid loop — for every active rule, find available marketplace leads
// the rule qualifies for and atomically claim them up to the per-day budget.
// Runs nightly via cron; also exposed as an on-demand endpoint.

import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

interface Rule {
  id: string;
  user_id: string;
  name: string;
  service_keywords: string[];
  city_keywords: string[];
  zips: string[];
  min_ai_score: number;
  max_price_cents: number;
  daily_budget_cents: number;
  daily_spent_cents: number;
  daily_reset_at: string;
  total_claimed: number;
}

interface Lead {
  id: string;
  name: string;
  service_type: string;
  city: string | null;
  zip: string | null;
  ai_score: number;
  price_cents: number;
  status: string;
}

function leadQualifies(rule: Rule, lead: Lead): boolean {
  if (lead.status !== "available") return false;
  if (lead.ai_score < rule.min_ai_score) return false;
  if (lead.price_cents > rule.max_price_cents) return false;

  if (rule.zips.length > 0) {
    if (!lead.zip || !rule.zips.includes(lead.zip)) return false;
  }

  const svc = lead.service_type.toLowerCase();
  if (rule.service_keywords.length > 0 &&
      !rule.service_keywords.some((k) => svc.includes(k.toLowerCase()))) {
    return false;
  }

  const city = (lead.city ?? "").toLowerCase();
  if (rule.city_keywords.length > 0 &&
      !rule.city_keywords.some((k) => city.includes(k.toLowerCase()))) {
    return false;
  }
  return true;
}

async function runOnce() {
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: rulesData } = await admin
    .from("auto_bid_rules").select("*").eq("is_active", true);
  const rules = (rulesData ?? []) as Rule[];
  if (rules.length === 0) return { ok: true, claimed: 0 };

  // Reset daily spend if a new day has started.
  for (const r of rules) {
    if (r.daily_reset_at !== today) {
      await admin.from("auto_bid_rules")
        .update({ daily_spent_cents: 0, daily_reset_at: today })
        .eq("id", r.id);
      r.daily_spent_cents = 0;
      r.daily_reset_at = today;
    }
  }

  const { data: leadsData } = await admin
    .from("marketplace_leads")
    .select("id,name,service_type,city,zip,ai_score,price_cents,status,phone,email,notes,ai_summary")
    .eq("status", "available")
    .order("ai_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  const leads = (leadsData ?? []) as (Lead & {
    phone: string | null; email: string | null; notes: string | null; ai_summary: string | null;
  })[];

  let claimedCount = 0;

  for (const lead of leads) {
    for (const rule of rules) {
      if (!leadQualifies(rule, lead)) continue;
      if (rule.daily_spent_cents + lead.price_cents > rule.daily_budget_cents) continue;

      // Verify contractor's wallet has funds.
      const { data: profile } = await admin
        .from("profiles").select("credit_cents,account_type").eq("id", rule.user_id).single();
      if (!profile || profile.account_type !== "contractor") continue;
      if ((profile.credit_cents ?? 0) < lead.price_cents) continue;

      // Atomic debit.
      const { data: debited } = await admin.rpc("debit_wallet", {
        p_user_id: rule.user_id, p_amount: lead.price_cents,
      });
      if (!debited) continue;

      // Atomic mark sold.
      const { data: claimed, error: claimErr } = await admin
        .from("marketplace_leads")
        .update({
          status: "sold",
          buyer_id: rule.user_id,
          bought_at: new Date().toISOString(),
        })
        .eq("id", lead.id).eq("status", "available")
        .select("*").single();

      if (claimErr || !claimed) {
        // Race lost — refund.
        await admin.rpc("credit_wallet", { p_user_id: rule.user_id, p_amount: lead.price_cents });
        continue;
      }

      // Log wallet transaction.
      await admin.from("wallet_transactions").insert({
        user_id: rule.user_id, amount_cents: -lead.price_cents,
        kind: "claim", reference: lead.id,
        description: `Auto-bid: ${rule.name}`,
      });

      // Add to pipeline.
      const locationLine = claimed.city || claimed.zip
        ? `Location: ${[claimed.city, claimed.zip].filter(Boolean).join(", ")}` : null;
      const { data: pipelineLead } = await admin
        .from("leads").insert({
          user_id: rule.user_id,
          name: claimed.name,
          phone: claimed.phone, email: claimed.email,
          service_type: claimed.service_type,
          source: "Auto-bid",
          status: "new",
          notes: [`Auto-claimed via rule "${rule.name}"`, claimed.ai_summary, claimed.notes, locationLine]
            .filter(Boolean).join("\n\n") || null,
        }).select("id").single();

      if (pipelineLead) {
        await scheduleLeadFollowUps(admin, {
          userId: rule.user_id, leadId: pipelineLead.id, leadName: claimed.name,
        });
        await alertContractorOnLead(admin, rule.user_id, {
          title: claimed.name,
          body: `${claimed.service_type} · auto-claimed by "${rule.name}"`,
          source: "Auto-bid",
        });
      }

      // Update rule counters.
      await admin.from("auto_bid_rules").update({
        daily_spent_cents: rule.daily_spent_cents + lead.price_cents,
        total_claimed: rule.total_claimed + 1,
      }).eq("id", rule.id);
      rule.daily_spent_cents += lead.price_cents;
      rule.total_claimed += 1;

      claimedCount++;
      break; // move to next lead
    }
  }

  return { ok: true, claimed: claimedCount };
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runOnce());
}
export async function POST(request: Request) {
  return GET(request);
}
