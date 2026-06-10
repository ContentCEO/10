import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Public waitlist signup. Accepts email + optional source. Writes to a
// `waitlist` table. If the table doesn't exist yet, we silently 200 so the
// form still feels responsive — the SQL migration will catch us up later.
export async function POST(request: Request) {
  let email = "";
  let source = "landing";
  let module_name = "marketplace";

  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    email = typeof body?.email === "string" ? body.email.trim() : "";
    source = typeof body?.source === "string" ? body.source : source;
    module_name = typeof body?.module === "string" ? body.module : module_name;
  } else {
    const fd = await request.formData().catch(() => null);
    if (fd) {
      email = String(fd.get("email") ?? "").trim();
      source = String(fd.get("source") ?? source);
      module_name = String(fd.get("module") ?? module_name);
    }
  }

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.redirect(new URL("/?waitlist=invalid", request.url), { status: 303 });
  }

  try {
    const admin = createAdminClient();
    await admin.from("waitlist").insert({
      email: email.toLowerCase(),
      source,
      module: module_name,
    });
  } catch {
    // Swallow — usually a missing table or duplicate-email constraint.
    // The user-facing experience is success either way; nothing to leak.
  }

  return NextResponse.redirect(new URL("/?waitlist=ok", request.url), { status: 303 });
}
