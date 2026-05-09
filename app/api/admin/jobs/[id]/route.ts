import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

const Body = z.object({
  status: z.enum(["scheduled", "en_route", "in_progress", "completed", "canceled"]).optional(),
  scheduled_at: z.string().optional(),
  technician_name: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.status === "completed") {
    update.completed_at = new Date().toISOString();
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("jobs").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
