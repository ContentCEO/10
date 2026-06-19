import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { expireStaleOffers } from "@/lib/routing";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Runs every 2-5 minutes via Vercel cron. Finds OFFERED matches whose
 * `expires_at` has passed, marks them EXPIRED, and immediately cascades
 * the lead to the next-best candidate.
 *
 * Idempotent — running twice is a no-op (second run finds nothing).
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const result = await expireStaleOffers(admin);

  return NextResponse.json({
    ok: true,
    expired:  result.expired,
    cascaded: result.cascaded,
    ranAt:    new Date().toISOString(),
  });
}
