import { NextRequest } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { corsPreflight, corsResponse } from "@/lib/cors";

export const runtime = "nodejs";

const Body = z.object({
  slug: z.string().min(1),
  name: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  service: z.string().optional(),
  address: z.string().optional(),
  timeline: z.string().optional(),
  notes: z.string().optional(),
});

export async function OPTIONS(req: NextRequest) {
  return corsPreflight(req.headers.get("origin"));
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return corsResponse({ error: "Invalid request" }, { status: 400 }, origin);
  }

  const supa = createServiceClient();
  const { data: emp } = await supa
    .from("ai_employees")
    .select("id")
    .eq("public_slug", parsed.slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!emp) {
    return corsResponse({ error: "Not found" }, { status: 404 }, origin);
  }

  const { error } = await supa.from("leads").insert({
    ai_employee_id: emp.id,
    name: parsed.name || null,
    phone: parsed.phone || null,
    email: parsed.email || null,
    service: parsed.service || null,
    address: parsed.address || null,
    timeline: parsed.timeline || null,
    notes: parsed.notes || null,
  });

  if (error) {
    return corsResponse({ error: error.message }, { status: 500 }, origin);
  }
  return corsResponse({ ok: true }, { status: 200 }, origin);
}
