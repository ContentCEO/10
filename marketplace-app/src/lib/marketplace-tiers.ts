// Marketplace subscription tiers — single source of truth for pricing,
// included quotas, overage rates, and Stripe price ID env-var mapping.
//
// Tier math (per /pricing page):
//   Starter $99/mo  · 2  leads included · $60 overage · ~$50/lead at cap
//   Growth  $499/mo · 10 leads included · $50 overage · ~$50/lead at cap (most popular)
//   Pro     $999/mo · 25 leads included · $40 overage · ~$40/lead at cap (best value)
//
// Overage is billed as Stripe invoice items on the current subscription period,
// surfacing as a single line on the next invoice (not metered usage records).

export type MarketplaceTierSlug = "starter" | "growth" | "pro";

export interface MarketplaceTier {
  slug:                  MarketplaceTierSlug;
  name:                  string;
  monthlyCents:          number;
  includedLeads:         number;
  overagePerLeadCents:   number;
  envKey:                string; // Stripe price ID env var name
  description:           string;
  recommended:           boolean;
}

export const MARKETPLACE_TIERS: MarketplaceTier[] = [
  {
    slug: "starter",
    name: "Starter",
    monthlyCents:        9900,
    includedLeads:       2,
    overagePerLeadCents: 6000,
    envKey:              "STRIPE_PRICE_MARKETPLACE_STARTER",
    description:         "Try the platform. 2 leads/mo included. $60 each after.",
    recommended:         false,
  },
  {
    slug: "growth",
    name: "Growth",
    monthlyCents:        49900,
    includedLeads:       10,
    overagePerLeadCents: 5000,
    envKey:              "STRIPE_PRICE_MARKETPLACE_GROWTH",
    description:         "Most popular. 10 leads/mo included. $50 each after.",
    recommended:         true,
  },
  {
    slug: "pro",
    name: "Pro",
    monthlyCents:        99900,
    includedLeads:       25,
    overagePerLeadCents: 4000,
    envKey:              "STRIPE_PRICE_MARKETPLACE_PRO",
    description:         "Best value. 25 leads/mo included. $40 each after.",
    recommended:         false,
  },
];

export function getTier(slug: string): MarketplaceTier | undefined {
  return MARKETPLACE_TIERS.find((t) => t.slug === slug);
}

export function getTierByPriceId(priceId: string): MarketplaceTier | undefined {
  return MARKETPLACE_TIERS.find((t) => process.env[t.envKey] === priceId);
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US")}`;
}
