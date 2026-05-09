import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not set");
  cached = new Stripe(key, { apiVersion: "2024-09-30.acacia" });
  return cached;
}

export const PLANS = {
  starter: {
    label: "Starter",
    priceEnv: "STRIPE_PRICE_STARTER",
    description: "1 AI employee, 500 chats/mo",
  },
  pro: {
    label: "Pro",
    priceEnv: "STRIPE_PRICE_PRO",
    description: "5 AI employees, unlimited chats",
  },
} as const;

export type PlanKey = keyof typeof PLANS;
