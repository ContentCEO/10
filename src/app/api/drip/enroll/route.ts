import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DripStep } from "@/lib/drip-defaults";

export const runtime = "nodejs";

interface Body {
  lead_id?: string;
  sequence_id?: string;
}

interface SequenceRow { id: string; user_id: string; steps: DripStep[] }

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.lead_id || !body.sequence_id) {
    return NextResponse.json({ error: "lead_id + sequence_id required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: seq } = await admin
    .from("drip_sequences").select("id,user_id,steps")
    .eq("id", body.sequence_id).eq("user_id", user.id).single();
  if (!seq) return NextResponse.json({ error: "Sequence not found" }, { status: 404 });

  const sequence = seq as SequenceRow;
  const { data: lead } = await admin
    .from("leads").select("id,name").eq("id", body.lead_id).eq("user_id", user.id).single();
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Enrollment row
  const { data: enrollment, error: eErr } = await admin
    .from("drip_enrollments")
    .insert({ user_id: user.id, lead_id: body.lead_id, sequence_id: body.sequence_id })
    .select("id").single();
  if (eErr) {
    // Likely unique violation — already enrolled
    return NextResponse.json({ error: eErr.message }, { status: 400 });
  }

  // Schedule a follow_up for each step
  const now = Date.now();
  const rows = sequence.steps.map((s, idx) => ({
    user_id: user.id,
    lead_id: body.lead_id,
    title: `Drip step ${idx + 1} — ${(s.channel ?? "sms").toUpperCase()}`,
    notes: s.prompt,
    due_at: new Date(now + s.delay_days * 86_400_000).toISOString(),
    sequence_id: body.sequence_id,
    sequence_step: idx + 1,
  }));
  if (rows.length > 0) {
    await admin.from("follow_ups").insert(rows);
  }

  return NextResponse.json({
    ok: true,
    enrolled: { id: (enrollment as { id: string }).id, steps_scheduled: rows.length },
  });
}
