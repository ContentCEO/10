// Mirror of supabase/migrations/2026-05-12_dynamic_pricing.sql compute_lead_price.
// Used by the curation UI to show "Suggested: $X" alongside the price editor.

import type { BudgetTier } from "./marketplace";

export function computeLeadPrice(args: {
  ai_score: number;
  budget: BudgetTier | string;
  external_id: string | null;
}): number {
  const { ai_score, budget, external_id } = args;
  const ext = external_id ?? "";

  // Base by AI score
  let base_cents: number;
  if (ai_score >= 90)      base_cents = 5000;
  else if (ai_score >= 80) base_cents = 3000;
  else if (ai_score >= 70) base_cents = 2000;
  else if (ai_score >= 60) base_cents = 1200;
  else if (ai_score >= 50) base_cents = 800;
  else                     base_cents = 300;

  // Source multiplier from external_id prefix
  let source_mult = 1.0;
  if (ext.startsWith("samgov:")) source_mult = 1.5;
  else if (ext.startsWith("bid:")) source_mult = 1.4;
  else if (/^(boston|nyc|la|sf|seattle|austin|dallas|chicago|dc|detroit|cambridge|somerville|lowell):/.test(ext)) source_mult = 1.2;
  else if (ext.startsWith("nws:")) source_mult = 0.6;

  // Budget multiplier
  let budget_mult = 1.0;
  switch (budget) {
    case "over_50k": budget_mult = 1.5; break;
    case "15k_50k": budget_mult = 1.2; break;
    case "under_5k": budget_mult = 0.7; break;
    case "unsure":   budget_mult = 0.9; break;
  }

  const final_cents = Math.round(base_cents * source_mult * budget_mult);
  return Math.max(100, Math.min(10_000, final_cents));
}

export function formatSuggested(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}
