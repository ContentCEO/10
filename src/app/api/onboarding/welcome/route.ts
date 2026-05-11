import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface Body {
  business_name?: string | null;
  headline?: string | null;
  services?: string[];
  service_zips?: string[];
  service_cities?: string[];
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;

  const patch: Record<string, unknown> = {};
  if (body.business_name) patch.business_name = body.business_name.slice(0, 120);
  if (body.headline)      patch.headline = body.headline.slice(0, 200);
  if (Array.isArray(body.services))       patch.services = body.services.slice(0, 30).map((s) => s.slice(0, 60));
  if (Array.isArray(body.service_zips))   patch.service_zips = body.service_zips.slice(0, 50).map((s) => s.slice(0, 10));
  if (Array.isArray(body.service_cities)) patch.service_cities = body.service_cities.slice(0, 50).map((s) => s.slice(0, 80));

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, noop: true });
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
