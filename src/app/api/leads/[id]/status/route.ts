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

  // I-1: When a lead flips to won, auto-create a scheduled Job from it
  // (idempotent — only if no job exists for this lead yet). One less
  // click for the contractor; keeps lead → job linkage clean for ROI.
  if (body.status === "won") {
    const { data: lead } = await supabase
      .from("leads")
      .select("id,name,service_type,price,customer_id")
      .eq("id", params.id).eq("user_id", user.id).single();

    if (lead) {
      const { data: existing } = await supabase
        .from("jobs").select("id").eq("lead_id", params.id).maybeSingle();

      if (!existing) {
        await supabase.from("jobs").insert({
          user_id: user.id,
          lead_id: params.id,
          customer_id: lead.customer_id ?? null,
          title: `${lead.service_type ?? "Job"} · ${lead.name}`,
          description: "Auto-created from won lead.",
          status: "scheduled",
          price: lead.price ?? null,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
