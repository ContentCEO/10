import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { declineOffer } from "@/lib/routing";

export const runtime = "nodejs";

/**
 * Contractor declines (or skips) an offer in their match queue.
 * Body: { lead_id, reason? }
 *
 * Triggers immediate cascade to next-best candidate via the routing engine.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => ({})) as { lead_id?: string; reason?: string };
  if (!body.lead_id) return NextResponse.json({ error: "lead_id is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: match } = await admin
    .from("matches")
    .select("id")
    .eq("lead_id", body.lead_id)
    .eq("contractor_user_id", user.id)
    .eq("status", "offered")
    .maybeSingle();

  if (!match) return NextResponse.json({ error: "No active offer for that lead" }, { status: 404 });

  const result = await declineOffer(admin, (match as { id: string }).id, user.id, body.reason);
  return NextResponse.json({ ok: true, next: result.next ?? "no_candidate" });
}
