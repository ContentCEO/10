import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";
import { LEAD_STATUSES } from "@/lib/types";

const Patch = z.object({
  status: z.enum(LEAD_STATUSES as unknown as [string, ...string[]]).optional(),
  notes: z.string().max(5000).optional(),
  first_name: z.string().max(120).optional(),
  last_name: z.string().max(120).optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  company: z.string().max(200).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = Patch.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("leads")
    .update(body)
    .eq("id", params.id)
    .eq("workspace_id", ws.id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const ws = await getCurrentWorkspace(supabase);
  if (!ws) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", params.id)
    .eq("workspace_id", ws.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
