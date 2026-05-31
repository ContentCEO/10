import { createClient } from "@supabase/supabase-js";

// Service-role client for routes that need to bypass RLS — public
// capture form lookups/inserts, Stripe webhook subscription sync, etc.
// Never expose this in a Client Component.
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );
}
