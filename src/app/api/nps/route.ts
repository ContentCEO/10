import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Plan 1 / D-9 — Public NPS submission endpoint.
// Customer hits /nps/<job_id_or_token>?score=N — page records their answer.

interface Body { user_id?: string; customer_id?: string; job_id?: string; score?: number; comment?: string }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Body | null;
  if (!body || typeof body.score !== "number" || body.score < 0 || body.score > 10) {
    return NextResponse.json({ error: "score must be 0-10" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { error } = await admin.from("nps_responses").insert({
    user_id: body.user_id ?? null,
    customer_id: body.customer_id ?? null,
    job_id: body.job_id ?? null,
    score: body.score,
    comment: body.comment?.slice(0, 1000) ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
