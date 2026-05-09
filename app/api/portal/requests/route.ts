import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { sendEmail } from "@/lib/notify";

const Body = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  preferred_date: z.string().nullable().optional(),
  preferred_time_window: z.string().nullable().optional(),
  address: z.string().nullable().optional()
});

export async function POST(request: Request) {
  const profile = await getProfile();
  if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const json = await request.json();
  const parsed = Body.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_requests")
    .insert({ ...parsed.data, customer_id: profile.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Best-effort confirmation email; don't fail the request if email is misconfigured.
  await sendEmail({
    to: profile.email,
    subject: "We received your service request",
    html: `<p>Hi ${profile.full_name || "there"},</p>
           <p>We received your request: <strong>${parsed.data.title}</strong>.
           Our team will reach out shortly to confirm scheduling.</p>
           <p>— HomeCare Club</p>`
  }).catch(() => null);

  return NextResponse.json({ ok: true, request: data });
}
