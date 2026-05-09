import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

const Patch = z.object({
  name: z.string().min(1).max(120).optional(),
  business_context: z.string().max(4000).optional(),
});

export async function PATCH(req: Request) {
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
    .from("workspaces")
    .update(body)
    .eq("id", ws.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
