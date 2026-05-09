import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

const Body = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price_cents: z.number().int().nonnegative(),
  stripe_price_id: z.string().optional().nullable(),
  visits_per_year: z.number().int().nonnegative().default(0),
  features: z.array(z.string()).default([])
});

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const json = await request.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("plans").insert(parsed.data).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, plan: data });
}
