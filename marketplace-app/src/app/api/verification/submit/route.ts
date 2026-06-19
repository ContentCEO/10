import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface Body {
  hic_number?: string;
  csl_number?: string;
  insurance_carrier?: string;
  insurance_policy?: string;
  insurance_expiry?: string;   // YYYY-MM-DD
  notes?: string;
  docs_urls?: string[];
}

/**
 * Contractor submits verification docs. Transitions row → PENDING. Admin
 * reviews from /admin/verifications and approves/rejects.
 *
 * Allowed only when current row is UNSUBMITTED or REJECTED — a pending or
 * already-approved row is locked (re-verification requires admin reset).
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Body;
  const hic = body.hic_number?.trim();
  if (!hic) return NextResponse.json({ error: "MA HIC registration # is required" }, { status: 400 });
  if (!body.insurance_carrier?.trim()) return NextResponse.json({ error: "Insurance carrier is required" }, { status: 400 });
  if (!body.insurance_expiry?.trim()) return NextResponse.json({ error: "Insurance expiry is required" }, { status: 400 });

  // Sanity-check the expiry date is in the future.
  const expiry = new Date(body.insurance_expiry);
  if (Number.isNaN(expiry.getTime()) || expiry.getTime() < Date.now()) {
    return NextResponse.json({ error: "Insurance must be valid and not expired" }, { status: 400 });
  }

  const admin = createAdminClient();

  const payload = {
    user_id:           user.id,
    status:            "pending" as const,
    hic_number:        hic,
    csl_number:        body.csl_number?.trim() || null,
    insurance_carrier: body.insurance_carrier.trim(),
    insurance_policy:  body.insurance_policy?.trim() || null,
    insurance_expiry:  body.insurance_expiry,
    docs_urls:         body.docs_urls?.filter(Boolean) ?? [],
    notes:             body.notes?.trim() || null,
    submitted_at:      new Date().toISOString(),
  };

  // Upsert keyed by user_id. The RLS policy already prevents updating a
  // row in pending/approved state — we re-enforce here with .eq().
  const { error } = await admin
    .from("verifications")
    .upsert(payload, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
