import Stripe from "stripe";

let cached: Stripe | null = null;

export function stripe(): Stripe {
  if (cached) return cached;
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  cached = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-10-28.acacia" });
  return cached;
}
