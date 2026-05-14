import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";

export const runtime = "nodejs";

// Toggle an agent on/off, or update its cadence.
// PATCH /api/agents/<slug>
// Body: { enabled?: boolean, cadence_minutes?: number, config?: object }

export async function PATCH(request: Request, { params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!isOwnerEmail(user.email)) return NextResponse.json({ error: "Not owner" }, { status: 403 });

  const body = await request.json().catch(() => null) as {
    enabled?: boolean;
    cadence_minutes?: number;
    config?: Record<string, unknown>;
  } | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") update.enabled = body.enabled;
  if (typeof body.cadence_minutes === "number" && body.cadence_minutes > 0) {
    update.cadence_minutes = body.cadence_minutes;
  }
  if (body.config && typeof body.config === "object") update.config = body.config;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("agents").update(update).eq("slug", params.slug).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, agent: data });
}
