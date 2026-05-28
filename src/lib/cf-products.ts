/*
 * Catalog of every Contractor Flow Stripe product. The user adds a real
 * Stripe price ID for each row (in Vercel env vars) and the module
 * checkout flow looks up which one to use based on { module, tier }.
 *
 * Pricing comes from the architecture brief. Each row maps to one
 * Stripe Price ID env var.
 */

import type { CFModule } from "@/lib/subscriptions";

export interface CFProduct {
  module: CFModule;
  tier: string;                  // human label: "Starter", "Growth", "Foundation", etc.
  envKey: string;                // env var name holding the Stripe price ID
  monthlyCents?: number | null;  // display-only sticker price; Stripe is source of truth
  oneTimeCents?: number | null;
  description: string;
  recommended?: boolean;
  recurring: boolean;
}

export const CF_PRODUCTS: CFProduct[] = [
  // ───── CRM ─────────────────────────────────────────────────────────
  {
    module: "cf-crm", tier: "Starter", envKey: "STRIPE_PRICE_CRM_STARTER",
    monthlyCents: 4900, recurring: true,
    description: "Lead pipeline, customers, jobs. Up to 50 leads/mo.",
  },
  {
    module: "cf-crm", tier: "Growth", envKey: "STRIPE_PRICE_CRM_GROWTH",
    monthlyCents: 7900, recurring: true, recommended: true,
    description: "Everything in Starter + AI auto-replies, sequences, unlimited leads.",
  },
  {
    module: "cf-crm", tier: "Pro", envKey: "STRIPE_PRICE_CRM_PRO",
    monthlyCents: 14900, recurring: true,
    description: "Everything in Growth + multi-user, custom branding, priority support.",
  },

  // ───── Marketplace (single tier, monthly) ─────────────────────────
  {
    module: "cf-marketplace", tier: "Standard", envKey: "STRIPE_PRICE_MARKETPLACE_STANDARD",
    monthlyCents: 4900, recurring: true, recommended: true,
    description: "MA lead-gen engine — 22 scrapers, BatchData enrichment, Lob postcards, Meta Ads webhook, Vapi voice receptionist, ROI dashboard.",
  },

  // ───── Launchpad (3 tiers per the architecture brief) ─────────────
  {
    module: "cf-launchpad", tier: "Foundation", envKey: "STRIPE_PRICE_LAUNCHPAD_FOUNDATION",
    oneTimeCents: 199700, recurring: false,
    description: "5-page custom website, mobile-fast, GBP sync, contact form → CRM (free first 30 days), 14-day delivery, 2 revision rounds.",
  },
  {
    module: "cf-launchpad", tier: "Foundation + Growth (setup)", envKey: "STRIPE_PRICE_LAUNCHPAD_GROWTH_SETUP",
    oneTimeCents: 99700, recurring: false,
    description: "Setup fee for the Foundation + Growth tier (paired with the monthly retainer below).",
  },
  {
    module: "cf-launchpad", tier: "Foundation + Growth (monthly)", envKey: "STRIPE_PRICE_LAUNCHPAD_GROWTH_MONTHLY",
    monthlyCents: 99700, recurring: true, recommended: true,
    description: "Google Ads + Meta Ads management, monthly report, monthly strategy call, CF CRM free for 6 months. 6-month minimum.",
  },
  {
    module: "cf-launchpad", tier: "Revenue Share (setup)", envKey: "STRIPE_PRICE_LAUNCHPAD_REVSHARE_SETUP",
    oneTimeCents: 49700, recurring: false,
    description: "Setup fee for Revenue Share tier — aligned-incentives pricing.",
  },
  {
    module: "cf-launchpad", tier: "Revenue Share (monthly)", envKey: "STRIPE_PRICE_LAUNCHPAD_REVSHARE_MONTHLY",
    monthlyCents: 49700, recurring: true,
    description: "Everything in Foundation + Growth + 8% of attributed revenue. 12-month minimum.",
  },
];

export function getProductsForModule(m: CFModule): CFProduct[] {
  return CF_PRODUCTS.filter((p) => p.module === m);
}

export function findProduct(envKey: string): CFProduct | undefined {
  return CF_PRODUCTS.find((p) => p.envKey === envKey);
}
