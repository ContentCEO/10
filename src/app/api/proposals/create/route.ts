import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface Body {
  lead_id?: string;
  customer_id?: string;
  title: string;
  intro?: string;
  terms?: string;
  tiers: { name: string; price_cents: number; summary: string; line_items?: { label: string; qty: number; unit_price_cents: number }[] }[];
  customer_email?: string;
  customer_phone?: string;
  financing_url?: string;
  expires_in_days?: number;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!body.title || !Array.isArray(body.tiers) || body.tiers.length === 0) {
    return NextResponse.json({ error: "title + tiers required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const expiresAt = body.expires_in_days
    ? new Date(Date.now() + body.expires_in_days * 86_400_000).toISOString()
    : null;

  const { data, error } = await admin.from("proposals").insert({
    user_id: user.id,
    lead_id: body.lead_id ?? null,
    customer_id: body.customer_id ?? null,
    title: body.title.slice(0, 200),
    intro: body.intro?.slice(0, 2000) ?? null,
    terms: body.terms?.slice(0, 4000) ?? null,
    tiers: body.tiers,
    customer_email: body.customer_email ?? null,
    customer_phone: body.customer_phone ?? null,
    financing_url: body.financing_url ?? null,
    expires_at: expiresAt,
  }).select("id, share_token").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, proposal: data });
}
