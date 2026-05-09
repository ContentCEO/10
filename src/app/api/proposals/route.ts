import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const insert = {
    user_id: user.id,
    client_name: body.client_name ?? "Untitled",
    client_email: body.client_email ?? null,
    client_address: body.client_address ?? null,
    project_type: body.project_type ?? null,
    scope: body.scope ?? null,
    measurements: body.measurements ?? null,
    materials: body.materials ?? null,
    labor: body.labor ?? null,
    notes: body.notes ?? null,
    generated_text: body.generated_text ?? null,
    line_items: body.line_items ?? [],
    payment_schedule: body.payment_schedule ?? [],
    timeline: body.timeline ?? [],
    terms: body.terms ?? null,
    total_amount: body.total_amount ?? 0,
    photos: body.photos ?? [],
    status: body.status ?? "draft",
  };

  const { data, error } = await supabase.from("proposals").insert(insert).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
