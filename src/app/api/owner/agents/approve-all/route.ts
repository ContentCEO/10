import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";

export const runtime = "nodejs";

// Plan 1 / B-14 — Approve-all pending agent actions.
// Owner-only.

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isOwnerEmail(user.email)) return NextResponse.json({ error: "Not owner" }, { status: 403 });

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("agent_actions")
    .update({ approved: true, approved_by: user.id, approved_at: now })
    .eq("requires_approval", true)
    .is("approved", null)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, approved: data?.length ?? 0 });
}
