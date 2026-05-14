import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function redeem(userId: string, userEmail: string | null, code: string) {
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("employee_invites").select("*").eq("code", code).single();
  if (!invite) return { ok: false as const, error: "Invalid invite code" };
  if (invite.accepted_at) return { ok: false as const, error: "This code has already been used" };
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false as const, error: "This code has expired" };
  }
  if (invite.email && userEmail && invite.email.toLowerCase() !== userEmail.toLowerCase()) {
    return { ok: false as const, error: `This invite is for ${invite.email}` };
  }

  // Make sure the user's profile is type 'employee'.
  await admin.from("profiles").update({ account_type: "employee" }).eq("id", userId);

  // Mark the invite redeemed.
  await admin.from("employee_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq("id", invite.id);

  // Upsert the employee link.
  await admin.from("employee_links")
    .upsert({
      employee_id: userId,
      contractor_id: invite.contractor_id,
      role: invite.role,
      hourly_rate_cents: invite.hourly_rate_cents,
      status: "active",
    }, { onConflict: "employee_id,contractor_id" });

  return { ok: true as const, contractor_id: invite.contractor_id };
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let code = "";
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    code = typeof body?.code === "string" ? body.code.trim() : "";
  } else {
    const form = await request.formData();
    code = String(form.get("code") ?? "").trim();
  }
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });

  const result = await redeem(user.id, user.email ?? null, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // If called from a form post, redirect; otherwise JSON.
  if (!ct.includes("application/json")) {
    return NextResponse.redirect(new URL("/work", request.url));
  }
  return NextResponse.json(result);
}
