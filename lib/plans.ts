import type { Plan } from "./types";

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 5,
  starter: 100,
  pro: 1000,
};

export const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: "$0",
    description: "Try AdForge AI",
    features: ["5 generations / month", "Up to 4 variants per generation", "CSV export"],
    priceEnvKey: null,
  },
  {
    id: "starter" as const,
    name: "Starter",
    price: "$29",
    description: "For small brands shipping ads weekly",
    features: ["100 generations / month", "All angles & frameworks", "CSV export", "Email support"],
    priceEnvKey: "STRIPE_PRICE_STARTER" as const,
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "$99",
    description: "For agencies & high-volume advertisers",
    features: [
      "1,000 generations / month",
      "All angles & frameworks",
      "Campaign structure plans",
      "Priority support",
    ],
    priceEnvKey: "STRIPE_PRICE_PRO" as const,
  },
];

export function planFromPriceId(priceId: string | null | undefined): Plan {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_STARTER) return "starter";
  if (priceId === process.env.STRIPE_PRICE_PRO) return "pro";
  return "free";
}
