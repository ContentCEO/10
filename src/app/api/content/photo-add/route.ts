import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface Body {
  url?: string;
  kind?: "before" | "after" | "progress" | "other";
  caption?: string;
  service?: string;
  city?: string;
  job_id?: string;
  customer_id?: string;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin.from("job_photos").insert({
    user_id: user.id,
    url: body.url.slice(0, 1000),
    kind: body.kind ?? "after",
    caption: body.caption?.slice(0, 500) ?? null,
    service: body.service ?? null,
    city: body.city ?? null,
    job_id: body.job_id ?? null,
    customer_id: body.customer_id ?? null,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, photo: data });
}
