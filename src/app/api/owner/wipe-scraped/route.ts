import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";

export const runtime = "nodejs";
export const maxDuration = 60;

/*
 * Destructive: wipe every scraped lead.
 *
 * Hard-deletes from marketplace_leads where source_channel='scraped'
 * AND status != 'sold' (sold leads stay so historical buyer records
 * survive). Also deletes mirrored copies from `leads` where source
 * starts with "scrape:".
 *
 * Owner-only.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isOwnerEmail(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  // marketplace_leads: scraped + not sold
  const { data: deletedMarket, error: mErr } = await admin
    .from("marketplace_leads")
    .delete()
    .eq("source_channel", "scraped")
    .neq("status", "sold")
    .select("id");
  if (mErr) return NextResponse.json({ ok: false, error: mErr.message }, { status: 500 });

  // leads: any row tagged source='scrape:...'
  const { data: deletedLeads, error: lErr } = await admin
    .from("leads")
    .delete()
    .ilike("source", "scrape:%")
    .select("id");
  if (lErr) return NextResponse.json({ ok: false, error: lErr.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    marketplace_deleted: deletedMarket?.length ?? 0,
    leads_deleted: deletedLeads?.length ?? 0,
  });
}
