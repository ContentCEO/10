import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Plan 1 / A-10 — Pin / unpin a customer.
// POST /api/customers/[id]/pin  { pinned: boolean }

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as { pinned?: boolean } | null;
  if (!body || typeof body.pinned !== "boolean") {
    return NextResponse.json({ error: "Body must be { pinned: boolean }" }, { status: 400 });
  }

  const { error } = await supabase
    .from("customers")
    .update({ is_pinned: body.pinned })
    .eq("id", params.id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
