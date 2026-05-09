import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

const Body = z.object({
  status: z.enum(["draft", "open", "paid", "void"])
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const update: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.status === "paid") update.paid_at = new Date().toISOString();
  const { error } = await supabase.from("invoices").update(update).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
