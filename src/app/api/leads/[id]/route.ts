import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// PATCH /api/leads/[id]   Body: { name?, email?, phone?, service_type?, estimated_value? }
// Per-field updates from inline editing on the leads list. Only the lead's
// owner can update.

const ALLOWED_FIELDS = new Set(["name", "email", "phone", "service_type", "estimated_value"]);

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  for (const k of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(k)) continue;
    if (k === "estimated_value") {
      const v = body[k];
      if (v === null || v === "") update[k] = null;
      else {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0) {
          return NextResponse.json({ error: "estimated_value must be a non-negative number" }, { status: 400 });
        }
        update[k] = n;
      }
    } else {
      const v = body[k];
      if (v === null || v === "") update[k] = null;
      else if (typeof v === "string") update[k] = v.slice(0, 500);
      else return NextResponse.json({ error: `${k} must be string or null` }, { status: 400 });
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads")
    .update(update)
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id,name,email,phone,service_type,estimated_value")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)  return NextResponse.json({ error: "Lead not found or access denied" }, { status: 404 });
  return NextResponse.json({ ok: true, lead: data });
}
