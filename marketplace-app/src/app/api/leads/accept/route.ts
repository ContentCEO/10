import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptOffer } from "@/lib/routing";

export const runtime = "nodejs";

/**
 * Contractor accepts an offer in their match queue.
 * Body: { lead_id }   (we look up the active OFFERED match for this user + lead)
 *
 * Flow:
 *  - Find this contractor's active offer for this lead
 *  - Transition match → ACCEPTED
 *  - Transition lead → SOLD with buyer_id = current user
 *  - (Future) charge wallet / decrement quota / etc.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { lead_id } = await request.json().catch(() => ({})) as { lead_id?: string };
  if (!lead_id) return NextResponse.json({ error: "lead_id is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: match } = await admin
    .from("matches")
    .select("id")
    .eq("lead_id", lead_id)
    .eq("contractor_user_id", user.id)
    .eq("status", "offered")
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!match) {
    return NextResponse.json(
      { error: "This lead isn't offered to you (or the window expired)." },
      { status: 409 },
    );
  }

  const result = await acceptOffer(admin, (match as { id: string }).id, user.id);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Could not accept" }, { status: 409 });

  return NextResponse.json({ ok: true, lead_id });
}
