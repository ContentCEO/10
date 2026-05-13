import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";

export const runtime = "nodejs";

// Approve / deny a pending agent action.
// POST { action_id: uuid, decision: "approve" | "deny" }

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isOwnerEmail(user.email)) return NextResponse.json({ error: "Not owner" }, { status: 403 });

  const body = await request.json().catch(() => null) as { action_id?: string; decision?: string } | null;
  if (!body?.action_id || !["approve", "deny"].includes(body.decision ?? "")) {
    return NextResponse.json({ error: "Body must be { action_id, decision: 'approve' | 'deny' }" }, { status: 400 });
  }

  const admin = createAdminClient();
  const approved = body.decision === "approve";
  const { error } = await admin.from("agent_actions").update({
    approved,
    approved_by: user.id,
    approved_at: new Date().toISOString(),
  }).eq("id", body.action_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, action_id: body.action_id, approved });
}
