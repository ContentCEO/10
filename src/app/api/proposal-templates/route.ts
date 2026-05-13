import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Plan 1 / D-2 — Proposal templates CRUD.
// GET  /api/proposal-templates           — list this user's templates
// POST /api/proposal-templates           — create or update by name

interface Tier { name: string; price_cents: number; summary: string; line_items: { label: string; qty: number; unit_price_cents: number }[] }
interface Body { name?: string; service_type?: string; intro?: string; terms?: string; tiers?: Tier[]; id?: string }

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("proposal_templates")
    .select("id,name,service_type,intro,terms,tiers,created_at,updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, templates: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.name || typeof body.name !== "string" || body.name.trim().length < 1) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (!Array.isArray(body.tiers)) {
    return NextResponse.json({ error: "tiers required (array)" }, { status: 400 });
  }
  if (body.tiers.length > 5) {
    return NextResponse.json({ error: "max 5 tiers" }, { status: 400 });
  }

  const record = {
    user_id: user.id,
    name: body.name.trim().slice(0, 120),
    service_type: body.service_type?.slice(0, 120) ?? null,
    intro: body.intro?.slice(0, 5000) ?? null,
    terms: body.terms?.slice(0, 5000) ?? null,
    tiers: body.tiers,
    updated_at: new Date().toISOString(),
  };

  let res;
  if (body.id) {
    res = await supabase.from("proposal_templates")
      .update(record).eq("id", body.id).eq("user_id", user.id)
      .select("id,name").single();
  } else {
    res = await supabase.from("proposal_templates")
      .insert(record).select("id,name").single();
  }
  if (res.error) return NextResponse.json({ error: res.error.message }, { status: 500 });
  return NextResponse.json({ ok: true, template: res.data });
}
