import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface Body {
  id?: string;
  action?: "approve" | "reject";
  price_cents?: number;
  ai_score?: number;
  reason?: string;
}

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) return null;
  return user;
}

export async function POST(req: Request) {
  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.id || !body.action) {
    return NextResponse.json({ error: "id and action are required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (body.action === "approve") {
    const patch: Record<string, unknown> = {
      requires_curation: false,
      curated_by: user.id,
      curated_at: now,
    };
    if (typeof body.price_cents === "number" && body.price_cents >= 0) {
      patch.price_cents = Math.floor(body.price_cents);
    }
    if (typeof body.ai_score === "number" && body.ai_score >= 0 && body.ai_score <= 100) {
      patch.ai_score = Math.floor(body.ai_score);
    }
    const { error } = await admin.from("marketplace_leads").update(patch).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, approved: true });
  }

  if (body.action === "reject") {
    const { error } = await admin.from("marketplace_leads").update({
      status: "expired",
      requires_curation: false,
      curated_by: user.id,
      curated_at: now,
      rejection_reason: body.reason?.slice(0, 500) ?? "Rejected during curation",
    }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, rejected: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
