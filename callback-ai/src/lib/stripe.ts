import Stripe from "stripe";
import { env } from "@/lib/env";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  if (!cached) {
    cached = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-09-30.acacia"
    });
  }
  return cached;
}
