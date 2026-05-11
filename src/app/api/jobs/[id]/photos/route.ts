import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const url = typeof body?.url === "string" ? body.url.trim() : "";
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  // Verify the job exists and we have access to it via RLS by selecting it.
  const { data: job } = await supabase
    .from("jobs").select("id,user_id").eq("id", params.id).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { error } = await supabase.from("job_photos").insert({
    user_id: job.user_id,
    job_id: params.id,
    url,
    caption: typeof body?.caption === "string" ? body.caption || null : null,
    phase:   typeof body?.phase   === "string" ? body.phase   || null : null,
    uploaded_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const photoId = url.searchParams.get("id");
  if (!photoId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("job_photos").delete()
    .eq("id", photoId).eq("job_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
