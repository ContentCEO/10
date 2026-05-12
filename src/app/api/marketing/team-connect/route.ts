import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOutboundConfigured, sendEmail } from "@/lib/messaging";

export const runtime = "nodejs";

interface Body {
  needs?: string[];
  budget?: string;
  phone?: string;
  notes?: string;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Body;
  if (!Array.isArray(body.needs) || body.needs.length === 0) {
    return NextResponse.json({ error: "At least one need is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("marketing_intakes").insert({
    user_id: user.id,
    needs: body.needs.slice(0, 20).map((n) => n.slice(0, 80)),
    budget: body.budget?.slice(0, 40) ?? null,
    phone: body.phone?.slice(0, 40) ?? null,
    notes: body.notes?.slice(0, 2000) ?? null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the owner (best effort)
  const ownerEmail = process.env.OWNER_NOTIFICATION_EMAIL;
  const { data: profile } = await admin
    .from("profiles").select("business_name").eq("id", user.id).single();
  const business = (profile as { business_name?: string } | null)?.business_name ?? user.email ?? "(unknown)";

  if (ownerEmail && isOutboundConfigured().email) {
    await sendEmail(
      ownerEmail,
      `Marketing intake: ${business}`,
`New marketing intake submitted:

User: ${business} (${user.email ?? user.id})
Needs: ${body.needs.join(", ")}
Budget: ${body.budget ?? "(not specified)"}
Phone: ${body.phone ?? "(not specified)"}

Notes:
${body.notes ?? "(none)"}`,
      "ContractorFlow",
    );
  }

  return NextResponse.json({ ok: true });
}
