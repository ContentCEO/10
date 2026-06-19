// ──────────────────────────────────────────────────────────────────────────
// Exclusive routing engine — the wedge that makes "$49 flat / never resold"
// not theater. Every lead is offered to ONE contractor at a time within an
// exclusive window; if declined or expired, it cascades to the next-best.
//
// The cascade order is determined by `scoreMatch(lead, contractor)`. The
// score is intentionally simple at launch (trade+town fit, freshness
// fairness) — we'll layer in verified-seal weight, win-rate, response-time
// (per spec §6.2) once those signals are tracked.
// ──────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";
import { classifyTrade } from "./trades";

/** How long a single offer is held before the cascade moves on. */
export const EXCLUSIVE_WINDOW_MIN = 45;

/** Cap the cascade depth so an unwanted lead doesn't stall on inactive contractors. */
export const MAX_CASCADE_DEPTH = 10;

interface LeadRow {
  id: string;
  service_type: string | null;
  ai_summary: string | null;
  notes: string | null;
  zip: string | null;
  city: string | null;
  budget: string | null;
  ai_score: number | null;
  created_at: string;
}

interface CandidateContractor {
  user_id: string;
  trades: string[];             // marketplace_preferences.trades
  zips: string[];               // marketplace_preferences.zips
  min_budget_cents: number;
  paused_until: string | null;
  // Aggregates for scoring:
  recent_offer_count: number;   // how many active offers does this contractor already hold?
  declined_30d: number;         // declines in last 30 days (penalize over-decliners)
}

// ──────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────

/**
 * Entry point: route a lead to the first matched contractor, or `null`
 * if no candidate exists. Idempotent: re-calling on a lead that already
 * has an active OFFERED match returns that match instead of creating a
 * second one (the DB unique index would reject the second anyway).
 */
export async function routeLead(
  admin: SupabaseClient,
  leadId: string,
): Promise<{ status: "offered" | "no_candidate" | "already_offered"; matchId?: string }> {
  // Already routed?
  const { data: active } = await admin
    .from("matches")
    .select("id, contractor_user_id")
    .eq("lead_id", leadId)
    .eq("status", "offered")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (active) return { status: "already_offered", matchId: (active as { id: string }).id };

  const lead = await loadLead(admin, leadId);
  if (!lead) return { status: "no_candidate" };

  const ranked = await rankCandidates(admin, lead);
  if (ranked.length === 0) return { status: "no_candidate" };

  return offerToNext(admin, leadId, ranked, 0);
}

/**
 * Contractor accepts an offer. Transitions match → ACCEPTED + marks the
 * lead as `sold` so it disappears from everyone else's view. The unique
 * partial index on `status = 'offered'` already guarantees no one else
 * can race in here.
 */
export async function acceptOffer(
  admin: SupabaseClient,
  matchId: string,
  contractorUserId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { data: m, error: mErr } = await admin
    .from("matches")
    .select("id, lead_id, contractor_user_id, status, expires_at")
    .eq("id", matchId)
    .single();
  if (mErr || !m) return { ok: false, error: "Match not found" };
  if (m.contractor_user_id !== contractorUserId) return { ok: false, error: "Not your offer" };
  if (m.status !== "offered") return { ok: false, error: "Offer no longer open" };
  if (new Date(m.expires_at).getTime() < Date.now()) {
    await admin.from("matches").update({ status: "expired", responded_at: new Date().toISOString() }).eq("id", matchId);
    return { ok: false, error: "Offer window expired" };
  }

  const now = new Date().toISOString();
  await admin.from("matches")
    .update({ status: "accepted", responded_at: now })
    .eq("id", matchId);

  await admin.from("marketplace_leads")
    .update({ status: "sold", buyer_id: contractorUserId, bought_at: now })
    .eq("id", m.lead_id);

  return { ok: true };
}

/**
 * Contractor declines or skips an offer. Transitions match → DECLINED,
 * then immediately offers the lead to the next-best candidate.
 */
export async function declineOffer(
  admin: SupabaseClient,
  matchId: string,
  contractorUserId: string,
  reason?: string,
): Promise<{ ok: boolean; next?: "offered" | "no_candidate" }> {
  const { data: m } = await admin
    .from("matches")
    .select("id, lead_id, contractor_user_id, status, cascade_index")
    .eq("id", matchId)
    .single();
  if (!m || (m as { contractor_user_id: string }).contractor_user_id !== contractorUserId) {
    return { ok: false };
  }
  if ((m as { status: string }).status !== "offered") return { ok: false };

  await admin.from("matches")
    .update({ status: "declined", responded_at: new Date().toISOString(), decline_reason: reason ?? null })
    .eq("id", matchId);

  const cascadeIndex = (m as { cascade_index: number }).cascade_index;
  if (cascadeIndex + 1 >= MAX_CASCADE_DEPTH) return { ok: true, next: "no_candidate" };

  const lead = await loadLead(admin, (m as { lead_id: string }).lead_id);
  if (!lead) return { ok: true, next: "no_candidate" };

  // Re-rank excluding contractors who already saw this lead in this cascade.
  const seen = await loadSeenContractors(admin, (m as { lead_id: string }).lead_id);
  const candidates = (await rankCandidates(admin, lead)).filter((c) => !seen.has(c.user_id));
  if (candidates.length === 0) return { ok: true, next: "no_candidate" };

  const offered = await offerToNext(admin, (m as { lead_id: string }).lead_id, candidates, cascadeIndex + 1);
  return { ok: true, next: offered.status === "offered" ? "offered" : "no_candidate" };
}

/**
 * Cron: expire stale OFFERED matches and cascade each one to the next
 * candidate. Should run every 1-5 minutes.
 */
export async function expireStaleOffers(admin: SupabaseClient): Promise<{ expired: number; cascaded: number }> {
  const now = new Date().toISOString();
  const { data: stale } = await admin
    .from("matches")
    .select("id, lead_id, contractor_user_id, cascade_index")
    .eq("status", "offered")
    .lt("expires_at", now)
    .limit(500);

  const rows = (stale ?? []) as Array<{ id: string; lead_id: string; cascade_index: number }>;
  let cascaded = 0;

  for (const m of rows) {
    await admin.from("matches")
      .update({ status: "expired", responded_at: now })
      .eq("id", m.id);

    if (m.cascade_index + 1 >= MAX_CASCADE_DEPTH) continue;
    const lead = await loadLead(admin, m.lead_id);
    if (!lead) continue;
    const seen = await loadSeenContractors(admin, m.lead_id);
    const candidates = (await rankCandidates(admin, lead)).filter((c) => !seen.has(c.user_id));
    if (candidates.length === 0) continue;
    const offered = await offerToNext(admin, m.lead_id, candidates, m.cascade_index + 1);
    if (offered.status === "offered") cascaded++;
  }

  return { expired: rows.length, cascaded };
}

// ──────────────────────────────────────────────────────────────────────
// Internals
// ──────────────────────────────────────────────────────────────────────

async function loadLead(admin: SupabaseClient, leadId: string): Promise<LeadRow | null> {
  const { data, error } = await admin
    .from("marketplace_leads")
    .select("id, service_type, ai_summary, notes, zip, city, budget, ai_score, created_at")
    .eq("id", leadId)
    .single();
  if (error || !data) return null;
  return data as LeadRow;
}

async function loadSeenContractors(admin: SupabaseClient, leadId: string): Promise<Set<string>> {
  const { data } = await admin
    .from("matches")
    .select("contractor_user_id")
    .eq("lead_id", leadId);
  const set = new Set<string>();
  for (const row of (data ?? []) as Array<{ contractor_user_id: string }>) set.add(row.contractor_user_id);
  return set;
}

/**
 * Rank all qualified contractors for a given lead, best-first. Returns
 * candidates with their freshness/load aggregates so the scoring function
 * doesn't need to round-trip back to the DB per contractor.
 */
async function rankCandidates(admin: SupabaseClient, lead: LeadRow): Promise<CandidateContractor[]> {
  // Eligible = has active marketplace subscription.
  const { data: subs } = await admin
    .from("marketplace_subscriptions")
    .select("user_id")
    .in("status", ["active", "trialing"]);
  const eligible = new Set((subs ?? []).map((s: { user_id: string }) => s.user_id));
  if (eligible.size === 0) return [];

  // Pull preferences for all eligible contractors in one query.
  const { data: prefs } = await admin
    .from("marketplace_preferences")
    .select("user_id, trades, zips, min_budget_cents, paused_until")
    .in("user_id", Array.from(eligible));

  // Recent-offer counts per contractor (the freshness-fairness signal).
  const { data: activeOffers } = await admin
    .from("matches")
    .select("contractor_user_id")
    .eq("status", "offered");
  const offerCount = new Map<string, number>();
  for (const m of (activeOffers ?? []) as Array<{ contractor_user_id: string }>) {
    offerCount.set(m.contractor_user_id, (offerCount.get(m.contractor_user_id) ?? 0) + 1);
  }

  // 30-day decline count per contractor (penalize over-decliners).
  const thirtyAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data: declines } = await admin
    .from("matches")
    .select("contractor_user_id")
    .eq("status", "declined")
    .gte("responded_at", thirtyAgo);
  const declineCount = new Map<string, number>();
  for (const m of (declines ?? []) as Array<{ contractor_user_id: string }>) {
    declineCount.set(m.contractor_user_id, (declineCount.get(m.contractor_user_id) ?? 0) + 1);
  }

  const tradeOfLead = classifyTrade([lead.service_type, lead.ai_summary, lead.notes].filter(Boolean).join(" \n "));

  const candidates: CandidateContractor[] = [];
  for (const p of (prefs ?? []) as Array<{
    user_id: string;
    trades: string[];
    zips: string[];
    min_budget_cents: number;
    paused_until: string | null;
  }>) {
    // Snooze respected.
    if (p.paused_until && new Date(p.paused_until).getTime() > Date.now()) continue;

    // Trade filter — if contractor restricts, must match.
    if ((p.trades?.length ?? 0) > 0) {
      if (!tradeOfLead || !p.trades.includes(tradeOfLead)) continue;
    }
    // ZIP filter — if contractor restricts, must match.
    if ((p.zips?.length ?? 0) > 0) {
      if (!lead.zip || !p.zips.includes(lead.zip)) continue;
    }
    // Min budget — skip if lead too small.
    if ((p.min_budget_cents ?? 0) > 0) {
      const minLeadCents = budgetMinCents(lead.budget);
      if (minLeadCents !== null && minLeadCents < p.min_budget_cents) continue;
    }
    candidates.push({
      user_id: p.user_id,
      trades: p.trades ?? [],
      zips: p.zips ?? [],
      min_budget_cents: p.min_budget_cents ?? 0,
      paused_until: p.paused_until,
      recent_offer_count: offerCount.get(p.user_id) ?? 0,
      declined_30d: declineCount.get(p.user_id) ?? 0,
    });
  }

  // Score + sort desc.
  const scored = candidates
    .map((c) => ({ c, s: scoreMatch(lead, c, tradeOfLead) }))
    .sort((a, b) => b.s - a.s);

  return scored.map(({ c, s }) => Object.assign(c, { _score: s }));
}

/**
 * Composite score 0–1. Weights match spec §6.2 for the components we
 * can measure at launch; the unmeasured ones (sealTier, winRate,
 * responseSpeed) are temporarily folded into freshnessFairness so the
 * total still sums to 1.
 */
function scoreMatch(
  lead: LeadRow,
  c: CandidateContractor,
  tradeOfLead: string | null,
): number {
  // tradeTownFit: 1.0 if ZIP listed by contractor matches lead's ZIP,
  // 0.7 if trade matches but ZIP doesn't (or contractor lists no ZIPs),
  // 0.3 if neither matches but they were still pulled (subscription open).
  let tradeTownFit = 0.3;
  if (lead.zip && c.zips.includes(lead.zip)) tradeTownFit = 1.0;
  else if (tradeOfLead && c.trades.includes(tradeOfLead)) tradeTownFit = 0.7;

  // freshnessFairness: fewer active offers = higher priority. New + quiet
  // contractors get shots they wouldn't get under pure-score sorting.
  const freshnessFairness = 1 / (1 + Math.min(c.recent_offer_count, 5));

  // declineHealth: penalize over-decliners (>5 declines / 30d).
  const declineHealth = Math.max(0, 1 - c.declined_30d / 20);

  // Until seal/winRate/responseSpeed land:
  //   0.30 tradeTownFit + 0.55 freshnessFairness + 0.15 declineHealth = 1.0
  return 0.30 * tradeTownFit + 0.55 * freshnessFairness + 0.15 * declineHealth;
}

async function offerToNext(
  admin: SupabaseClient,
  leadId: string,
  ranked: CandidateContractor[],
  startIndex: number,
): Promise<{ status: "offered" | "no_candidate"; matchId?: string }> {
  // Skip contractors who already saw this lead (cascade integrity).
  const seen = await loadSeenContractors(admin, leadId);

  for (let i = startIndex; i < Math.min(ranked.length, startIndex + 1); i++) {
    const c = ranked[i];
    if (seen.has(c.user_id)) continue;
    const expires = new Date(Date.now() + EXCLUSIVE_WINDOW_MIN * 60_000).toISOString();
    const { data, error } = await admin
      .from("matches")
      .insert({
        lead_id: leadId,
        contractor_user_id: c.user_id,
        status: "offered",
        score: (c as CandidateContractor & { _score?: number })._score ?? 0,
        cascade_index: i,
        expires_at: expires,
      })
      .select("id")
      .single();
    if (!error && data) {
      // TODO: enqueue SMS + email + push to this contractor (separate worker).
      return { status: "offered", matchId: (data as { id: string }).id };
    }
    // If the unique index rejected (concurrent offer), bail — the
    // existing one wins.
    if (error && /unique/.test(String(error.message ?? ""))) {
      return { status: "offered" };
    }
  }
  return { status: "no_candidate" };
}

// Best-effort min-budget extraction from a free-text budget label.
function budgetMinCents(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.replace(/[, ]/g, "").match(/\$?(\d+)(k|K)?/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n)) return null;
  return (m[2] ? n * 1000 : n) * 100;
}
