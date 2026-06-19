import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface Body {
  user_id?: string;
  decision?: "approve" | "reject";
  reject_reason?: string;
}

/**
 * Admin decision on a pending verification. APPROVE flips status → approved
 * (unlocks routing + verified seal). REJECT records a reason and lets the
 * contractor re-submit.
 *
 * Gated to profiles.is_admin = true.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!(prof as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Body;
  if (!body.user_id || (body.decision !== "approve" && body.decision !== "reject")) {
    return NextResponse.json({ error: "user_id + decision required" }, { status: 400 });
  }

  const update = body.decision === "approve"
    ? { status: "approved" as const, reviewed_by: user.id, reviewed_at: new Date().toISOString(), reject_reason: null }
    : {
        status: "rejected" as const,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        reject_reason: body.reject_reason?.trim() || "Re-submit with corrected details.",
      };

  const { error } = await admin
    .from("verifications")
    .update(update)
    .eq("user_id", body.user_id)
    .eq("status", "pending");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Approved → bump profile seal_tier to 'verified' immediately so the
  // contractor sees their seal without waiting for the nightly cron.
  // Higher tiers (verified_pro, top_pro) still require the cron.
  if (body.decision === "approve") {
    await admin.from("profiles")
      .update({ seal_tier: "verified", seal_earned_at: new Date().toISOString() })
      .eq("id", body.user_id)
      .eq("seal_tier", "none");
  }

  return NextResponse.json({ ok: true });
}
