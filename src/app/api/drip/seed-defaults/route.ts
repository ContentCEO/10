import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_DRIP_TEMPLATES, DEFAULT_SEASONAL_CAMPAIGNS } from "@/lib/drip-defaults";

export const runtime = "nodejs";

// One-click "seed me with defaults" — creates the 4 default sequences +
// 5 default seasonal campaigns for the current user. Idempotent via name.

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  let dripsCreated = 0, campaignsCreated = 0;

  for (const t of DEFAULT_DRIP_TEMPLATES) {
    const { data: existing } = await admin
      .from("drip_sequences").select("id").eq("user_id", user.id).eq("name", t.name).maybeSingle();
    if (existing) continue;
    const { error } = await admin.from("drip_sequences").insert({
      user_id: user.id, name: t.name, description: t.description, steps: t.steps,
    });
    if (!error) dripsCreated++;
  }
  for (const c of DEFAULT_SEASONAL_CAMPAIGNS) {
    const { data: existing } = await admin
      .from("seasonal_campaigns").select("id").eq("user_id", user.id).eq("name", c.name).maybeSingle();
    if (existing) continue;
    const { error } = await admin.from("seasonal_campaigns").insert({
      user_id: user.id, ...c,
    });
    if (!error) campaignsCreated++;
  }

  return NextResponse.json({ ok: true, dripsCreated, campaignsCreated });
}
