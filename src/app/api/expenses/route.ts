import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Per-job expense CRUD. Material costs, labor, subcontractor pay, etc.

interface Body {
  job_id?: string | null;
  kind?: "material" | "labor" | "subcontractor" | "equipment" | "permit" | "fuel" | "other";
  vendor?: string;
  description?: string;
  amount_cents?: number;
  tax_cents?: number;
  receipt_url?: string;
  spent_at?: string;
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const jobId = url.searchParams.get("job_id");
  let query = supabase.from("job_expenses").select("*")
    .eq("user_id", user.id)
    .order("spent_at", { ascending: false });
  if (jobId) query = query.eq("job_id", jobId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, expenses: data });
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.kind || body.amount_cents == null) {
    return NextResponse.json({ error: "kind + amount_cents required" }, { status: 400 });
  }

  const { data, error } = await supabase.from("job_expenses").insert({
    user_id: user.id,
    job_id: body.job_id ?? null,
    kind: body.kind,
    vendor: body.vendor?.slice(0, 200) ?? null,
    description: body.description?.slice(0, 500) ?? null,
    amount_cents: Math.round(Number(body.amount_cents)),
    tax_cents: Math.round(Number(body.tax_cents ?? 0)),
    receipt_url: body.receipt_url ?? null,
    spent_at: body.spent_at ?? new Date().toISOString().slice(0, 10),
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabase.from("job_expenses").delete()
    .eq("id", id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
