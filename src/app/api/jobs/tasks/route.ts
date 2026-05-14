import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface CreateBody { job_id?: string; title?: string }
interface UpdateBody { id?: string; is_done?: boolean; title?: string }

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as CreateBody | null;
  if (!body?.job_id || !body?.title?.trim()) {
    return NextResponse.json({ error: "job_id + title required" }, { status: 400 });
  }

  // Get max sort_order so we append.
  const { data: existing } = await supabase
    .from("job_tasks").select("sort_order")
    .eq("job_id", body.job_id).order("sort_order", { ascending: false }).limit(1).maybeSingle();
  const nextOrder = ((existing as { sort_order: number } | null)?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("job_tasks").insert({
    user_id: user.id,
    job_id: body.job_id,
    title: body.title.trim().slice(0, 200),
    sort_order: nextOrder,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as UpdateBody | null;
  if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof body.is_done === "boolean") {
    update.is_done = body.is_done;
    update.done_at = body.is_done ? new Date().toISOString() : null;
    update.done_by = body.is_done ? user.id : null;
  }
  if (typeof body.title === "string") update.title = body.title.trim().slice(0, 200);

  const { error } = await supabase.from("job_tasks").update(update)
    .eq("id", body.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabase.from("job_tasks").delete()
    .eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
