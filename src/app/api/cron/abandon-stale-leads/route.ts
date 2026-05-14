import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Auto-archive abandoned leads. Once a day:
//   - "new" leads untouched for 60+ days → set to "lost" with reason
//     "auto-archived: no contact"
//   - "contacted" leads untouched for 90+ days → set to "lost" with reason
//     "auto-archived: ghosted after first contact"
//
// Keeps the pipeline page from filling with leads that'll never close.
// Lost leads still show up in /grow/win-loss for visibility.

interface LeadRow {
  id: string;
  status: string;
  updated_at: string;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const sixtyDays  = new Date(Date.now() - 60 * 86_400_000).toISOString();
  const ninetyDays = new Date(Date.now() - 90 * 86_400_000).toISOString();

  // 60d stale "new" leads
  const { data: newStale } = await admin
    .from("leads").select("id,status,updated_at")
    .eq("status", "new").lt("updated_at", sixtyDays).limit(500);

  // 90d stale "contacted" leads
  const { data: contStale } = await admin
    .from("leads").select("id,status,updated_at")
    .eq("status", "contacted").lt("updated_at", ninetyDays).limit(500);

  const newRows = (newStale ?? []) as LeadRow[];
  const contRows = (contStale ?? []) as LeadRow[];

  let archivedNew = 0;
  let archivedContacted = 0;

  if (newRows.length > 0) {
    const { error } = await admin
      .from("leads")
      .update({ status: "lost", win_loss_reason: "auto-archived: no contact" })
      .in("id", newRows.map((r) => r.id));
    if (!error) archivedNew = newRows.length;
  }

  if (contRows.length > 0) {
    const { error } = await admin
      .from("leads")
      .update({ status: "lost", win_loss_reason: "auto-archived: ghosted after first contact" })
      .in("id", contRows.map((r) => r.id));
    if (!error) archivedContacted = contRows.length;
  }

  return NextResponse.json({
    ok: true,
    archived_new: archivedNew,
    archived_contacted: archivedContacted,
  });
}

export async function POST(request: Request) { return GET(request); }
