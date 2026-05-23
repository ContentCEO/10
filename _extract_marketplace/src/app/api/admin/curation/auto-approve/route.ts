import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as { threshold?: number };
  const t = Math.max(0, Math.min(100, Math.floor(body.threshold ?? 0)));

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ auto_approve_score_threshold: t })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Bulk approve any pending leads above the new threshold
  if (t > 0) {
    await admin
      .from("marketplace_leads")
      .update({
        requires_curation: false,
        curated_by: user.id,
        curated_at: new Date().toISOString(),
      })
      .eq("requires_curation", true)
      .gte("ai_score", t);
  }

  return NextResponse.json({ ok: true, threshold: t });
}
