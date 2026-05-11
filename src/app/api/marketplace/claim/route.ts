import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const admin = createAdminClient();

  // Atomically mark sold — only succeeds while still available.
  const { data: claimed, error: claimErr } = await admin
    .from("marketplace_leads")
    .update({
      status: "sold",
      buyer_id: user.id,
      bought_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "available")
    .select("*")
    .single();

  if (claimErr || !claimed) {
    return NextResponse.json(
      { error: "Lead already claimed or unavailable" },
      { status: 409 },
    );
  }

  // Add to the buyer's pipeline as a regular lead.
  const { data: lead, error: leadErr } = await admin
    .from("leads")
    .insert({
      user_id: user.id,
      name: claimed.name,
      phone: claimed.phone,
      email: claimed.email,
      service_type: claimed.service_type,
      source: "Marketplace",
      estimated_value: null,
      status: "new",
      notes: [
        claimed.ai_summary,
        claimed.notes,
        claimed.city || claimed.zip ? `Location: ${[claimed.city, claimed.zip].filter(Boolean).join(", ")}` : null,
      ].filter(Boolean).join("\n\n") || null,
    })
    .select("id")
    .single();

  if (leadErr || !lead) {
    return NextResponse.json(
      { error: leadErr?.message ?? "Could not add to pipeline" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, leadId: lead.id });
}
