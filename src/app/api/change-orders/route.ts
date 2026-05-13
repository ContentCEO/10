import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Plan 1 / E-12 — Change-order create.
// POST /api/change-orders  Body: { job_id?, reason, scope_change, price_delta_cents, timeline_delta_days }

interface Body {
  job_id?: string;
  reason?: string;
  scope_change?: string;
  price_delta_cents?: number;
  timeline_delta_days?: number;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.reason || !body?.scope_change) {
    return NextResponse.json({ error: "reason + scope_change required" }, { status: 400 });
  }

  // Determine next number for this job (best-effort sequence).
  let nextNumber = 1;
  if (body.job_id) {
    const { count } = await supabase
      .from("change_orders").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("job_id", body.job_id);
    nextNumber = (count ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from("change_orders")
    .insert({
      user_id: user.id,
      job_id: body.job_id ?? null,
      number: nextNumber,
      reason: body.reason.slice(0, 500),
      scope_change: body.scope_change.slice(0, 5000),
      price_delta_cents: Math.round(Number(body.price_delta_cents ?? 0)),
      timeline_delta_days: Math.round(Number(body.timeline_delta_days ?? 0)),
      status: "draft",
    })
    .select("id,number,share_token")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id, number: data.number, share_token: data.share_token });
}
