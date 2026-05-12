import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Public sign endpoint — customer hits /p/[token], picks a tier, types name,
// clicks sign. We accept token + tier + signature, no auth.

interface Body {
  share_token?: string;
  selected_tier_idx?: number;
  customer_signature?: string;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.share_token || typeof body.selected_tier_idx !== "number" || !body.customer_signature) {
    return NextResponse.json({ error: "share_token + selected_tier_idx + customer_signature required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: proposal } = await admin
    .from("proposals").select("id, status, expires_at, tiers")
    .eq("share_token", body.share_token).single();
  if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });

  const p = proposal as { id: string; status: string; expires_at: string | null; tiers: unknown[] };
  if (p.status === "signed" || p.status === "paid") {
    return NextResponse.json({ error: "Already signed" }, { status: 409 });
  }
  if (p.expires_at && new Date(p.expires_at) < new Date()) {
    return NextResponse.json({ error: "Proposal expired" }, { status: 410 });
  }
  if (body.selected_tier_idx < 0 || body.selected_tier_idx >= p.tiers.length) {
    return NextResponse.json({ error: "Invalid tier index" }, { status: 400 });
  }

  const { error } = await admin.from("proposals").update({
    status: "signed",
    selected_tier_idx: body.selected_tier_idx,
    customer_signature: body.customer_signature.slice(0, 200),
    signed_at: new Date().toISOString(),
  }).eq("id", p.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
