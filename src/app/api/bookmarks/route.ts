import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface CreateBody {
  kind?: "lead" | "job" | "customer" | "invoice" | "proposal" | "page";
  target_id?: string;
  label?: string;
  href?: string;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data } = await supabase.from("bookmarks").select("*")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  return NextResponse.json({ ok: true, bookmarks: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as CreateBody | null;
  if (!body?.kind || !body?.target_id || !body?.label || !body?.href) {
    return NextResponse.json({ error: "kind/target_id/label/href required" }, { status: 400 });
  }

  // Upsert by (user_id, kind, target_id) — toggles by deleting first.
  const { data: existing } = await supabase.from("bookmarks").select("id")
    .eq("user_id", user.id).eq("kind", body.kind).eq("target_id", body.target_id).maybeSingle();

  if (existing) {
    // Toggle off.
    await supabase.from("bookmarks").delete()
      .eq("id", (existing as { id: string }).id);
    return NextResponse.json({ ok: true, bookmarked: false });
  }

  const { error } = await supabase.from("bookmarks").insert({
    user_id: user.id,
    kind: body.kind,
    target_id: body.target_id,
    label: body.label.slice(0, 200),
    href: body.href.slice(0, 400),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, bookmarked: true });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabase.from("bookmarks").delete()
    .eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
