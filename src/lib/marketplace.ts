export type BudgetTier =
  | "under_5k"
  | "5k_15k"
  | "15k_50k"
  | "over_50k"
  | "unsure";

export type TimelineTier =
  | "asap"
  | "one_to_three_months"
  | "three_to_six_months"
  | "flexible";

export type MarketplaceStatus = "available" | "sold" | "expired";

export interface MarketplaceLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  zip: string | null;
  city: string | null;
  service_type: string;
  budget: BudgetTier;
  timeline: TimelineTier;
  notes: string | null;
  ai_score: number;
  ai_summary: string | null;
  price_cents: number;
  exclusivity: "shared" | "exclusive";
  status: MarketplaceStatus;
  buyer_id: string | null;
  bought_at: string | null;
  created_at: string;
  expires_at: string;
}

export const BUDGET_LABELS: Record<BudgetTier, string> = {
  under_5k:  "Under $5,000",
  "5k_15k":  "$5,000 – $15,000",
  "15k_50k": "$15,000 – $50,000",
  over_50k:  "Over $50,000",
  unsure:    "Not sure yet",
};

export const TIMELINE_LABELS: Record<TimelineTier, string> = {
  asap:                "ASAP",
  one_to_three_months: "1–3 months",
  three_to_six_months: "3–6 months",
  flexible:            "Flexible",
};
