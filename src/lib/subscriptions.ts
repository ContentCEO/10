/*
 * Contractor Flow sub-brand modules. Each module is a Stripe-billed
 * subscription. A user can hold any combination. The sidebar gates
 * entries by which modules they have active.
 *
 * For now (pre-Stripe-product setup), the owner email gets ALL modules
 * automatically, and other admins get CRM + Marketplace. Once Stripe
 * products are configured, this reads from the `subscriptions` table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isOwnerEmail } from "@/lib/owner";

export type CFModule =
  | "cf-crm"          // Lead pipeline + CRM. The base product.
  | "cf-launchpad"    // Agency-managed websites + ads.
  | "cf-marketplace"  // Lead marketplace + scraper engine.
  | "cf-academy"      // Training courses (future).
  | "cf-capital";     // Invoice factoring (future).

export const MODULE_LABELS: Record<CFModule, string> = {
  "cf-crm":          "Contractor Flow CRM",
  "cf-launchpad":    "Contractor Flow Launchpad",
  "cf-marketplace":  "Contractor Flow Marketplace",
  "cf-academy":      "Contractor Flow Academy",
  "cf-capital":      "Contractor Flow Capital",
};

export const MODULE_ACCENTS: Record<CFModule, string> = {
  "cf-crm":          "#3B5566", // slate blue
  "cf-launchpad":    "#C44A26", // rust orange
  "cf-marketplace":  "#4A5D3A", // forest green
  "cf-academy":      "#D4A847", // warm gold
  "cf-capital":      "#1A1A18", // charcoal
};

interface UserProfile {
  id: string;
  is_admin?: boolean | null;
}

/*
 * Resolve which modules a user can see/use.
 *
 * Resolution rules (in order):
 *   1. Owner email always gets every module.
 *   2. profiles.is_admin = true → CRM + Marketplace by default.
 *   3. Otherwise: only modules with an active subscriptions row.
 *
 * Future: when the subscriptions table is wired up, query it here.
 */
export async function getUserModules(
  supabase: SupabaseClient,
  user: { id: string; email?: string | null },
  profile: UserProfile | null,
): Promise<CFModule[]> {
  if (isOwnerEmail(user.email ?? null)) {
    return ["cf-crm", "cf-launchpad", "cf-marketplace", "cf-academy", "cf-capital"];
  }

  if (profile?.is_admin) {
    return ["cf-crm", "cf-marketplace"];
  }

  // TODO: replace with real subscription lookup once Stripe products are set up.
  //
  // const { data } = await supabase
  //   .from("subscriptions")
  //   .select("sub_brand")
  //   .eq("user_id", user.id)
  //   .eq("status", "active");
  // return (data ?? []).map((r) => r.sub_brand as CFModule);

  // Default for now: every signed-in user gets CRM.
  void supabase;
  return ["cf-crm"];
}

export function hasModule(userModules: CFModule[], required: CFModule): boolean {
  return userModules.includes(required);
}
