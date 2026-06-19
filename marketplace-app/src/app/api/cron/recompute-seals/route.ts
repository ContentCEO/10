import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recomputeSeals } from "@/lib/seal";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Nightly seal-tier recompute. Walks every approved contractor,
 * recomputes their tier from job-verified reviews + median response
 * time + win rate, and persists to profiles. The UI reads the
 * persisted value, so seal display is zero-cost on the hot path.
 *
 * Idempotent: running twice in a row finds no changes the second time.
 */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  const result = await recomputeSeals(admin);

  return NextResponse.json({
    ok: true,
    scanned:   result.scanned,
    promoted:  result.promoted,
    demoted:   result.demoted,
    unchanged: result.unchanged,
    ranAt:     new Date().toISOString(),
  });
}
