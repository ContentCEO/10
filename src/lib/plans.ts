// Subscription plans. Stripe price IDs are read from env at runtime so the
// same code works in test mode and live mode.

export type PlanId = "starter" | "growth" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  monthlyCents: number;
  envKey: string;            // Stripe price ID env var to use at checkout
  highlight?: string;
  features: string[];
  limits: {
    leadsPerMonth: number;   // -1 = unlimited
    aiCallsPerMonth: number; // -1 = unlimited
    recurringCustomers: number; // -1 = unlimited
    teamSeats: number;       // -1 = unlimited
  };
}

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    monthlyCents: 9900,
    envKey: "STRIPE_PRICE_STARTER",
    features: [
      "Lead pipeline + CRM",
      "AI quick-add + AI follow-up",
      "1 public capture form",
      "Up to 50 active leads/month",
      "100 AI generations/month",
    ],
    limits: {
      leadsPerMonth: 50,
      aiCallsPerMonth: 100,
      recurringCustomers: 5,
      teamSeats: 1,
    },
  },
  {
    id: "growth",
    name: "Growth",
    monthlyCents: 24900,
    envKey: "STRIPE_PRICE_GROWTH",
    highlight: "Most popular",
    features: [
      "Everything in Starter",
      "Marketplace claims with wallet",
      "Google Ads + Meta + Zapier intake",
      "Recurring service engine",
      "Public profile in /pros directory",
      "Up to 250 active leads/month",
      "500 AI generations/month",
    ],
    limits: {
      leadsPerMonth: 250,
      aiCallsPerMonth: 500,
      recurringCustomers: 50,
      teamSeats: 3,
    },
  },
  {
    id: "pro",
    name: "Pro",
    monthlyCents: 54900,
    envKey: "STRIPE_PRICE_PRO",
    features: [
      "Everything in Growth",
      "Unlimited leads + AI generations",
      "Unlimited recurring customers",
      "Auto SMS + email follow-up dispatch",
      "Year-over-year + profit insights dashboards",
      "Priority email support",
    ],
    limits: {
      leadsPerMonth: -1,
      aiCallsPerMonth: -1,
      recurringCustomers: -1,
      teamSeats: 10,
    },
  },
];

export function getPlan(id: string): Plan | null {
  return PLANS.find((p) => p.id === id) ?? null;
}

export function planPriceId(plan: Plan): string | null {
  const v = process.env[plan.envKey];
  return v && v.startsWith("price_") ? v : null;
}

// Fallback: if STRIPE_PRICE_ID is set (single-plan mode from earlier), use it
// for the Growth tier so existing setups keep working.
export function legacyPriceId(): string | null {
  const v = process.env.STRIPE_PRICE_ID;
  return v && v.startsWith("price_") ? v : null;
}
