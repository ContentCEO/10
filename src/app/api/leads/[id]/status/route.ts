import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// PATCH /api/leads/[id]/status  Body: { status: string }
// Updates the lead's status. Only owner of the lead (or admin) can update.

const VALID = new Set(["new", "contacted", "estimate", "estimate_sent", "won", "lost"]);

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as {
    status?: string;
    win_loss_reason?: string;
  } | null;
  if (!body?.status || !VALID.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const update: Record<string, unknown> = { status: body.status };
  if (body.status === "estimate" || body.status === "estimate_sent") {
    // Stamp estimate_sent_at the first time we mark this status.
    update.estimate_sent_at = new Date().toISOString();
  }
  if (body.status === "won" || body.status === "lost") {
    if (typeof body.win_loss_reason === "string" && body.win_loss_reason.trim()) {
      update.win_loss_reason = body.win_loss_reason.trim().slice(0, 240);
    }
  }

  const { error } = await supabase
    .from("leads")
    .update(update)
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
