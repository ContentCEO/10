import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

const Body = z.object({
  service_request_id: z.string().uuid().optional().nullable(),
  customer_id: z.string().uuid(),
  scheduled_at: z.string(),
  duration_minutes: z.number().int().positive().optional(),
  technician_name: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      service_request_id: parsed.data.service_request_id ?? null,
      customer_id: parsed.data.customer_id,
      scheduled_at: parsed.data.scheduled_at,
      duration_minutes: parsed.data.duration_minutes ?? 60,
      technician_name: parsed.data.technician_name ?? null,
      notes: parsed.data.notes ?? null
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (parsed.data.service_request_id) {
    await supabase
      .from("service_requests")
      .update({ status: "scheduled" })
      .eq("id", parsed.data.service_request_id);
  }

  return NextResponse.json({ ok: true, job });
}
