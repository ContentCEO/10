import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scheduleLeadFollowUps } from "@/lib/follow-up-sequence";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const admin = createAdminClient();

  // Verify the user (form owner) exists.
  const { data: profile } = await admin
    .from("profiles").select("id").eq("id", params.id).single();
  if (!profile) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));

  // Honeypot — bots that fill 'website' are silently dropped.
  if (body?.website) {
    return NextResponse.json({ ok: true });
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const insert = {
    user_id: profile.id,
    name,
    phone: typeof body?.phone === "string" ? body.phone || null : null,
    email: typeof body?.email === "string" ? body.email || null : null,
    service_type: typeof body?.service_type === "string" ? body.service_type || null : null,
    notes: typeof body?.notes === "string" ? body.notes || null : null,
    source: "Website form",
    status: "new" as const,
  };

  const { data: created, error } = await admin
    .from("leads").insert(insert).select("id").single();
  if (error || !created) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to create lead" },
      { status: 500 },
    );
  }

  await scheduleLeadFollowUps(admin, {
    userId: profile.id, leadId: created.id, leadName: name,
  });

  return NextResponse.json({ ok: true });
}
