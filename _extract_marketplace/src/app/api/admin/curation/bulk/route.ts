import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

interface BulkBody {
  ids?: string[];
  scope?: "selected" | "all_pending";
  action: "approve" | "reject";
  rejection_reason?: string;
}

/*
 * Bulk import scraped leads into the live marketplace.
 *
 *   scope="selected"   — flips requires_curation=false on the ids array.
 *   scope="all_pending" — flips it on every row where requires_curation=true.
 *
 * Approving = a row becomes visible in /marketplace to all contractors.
 * Rejecting = status set to expired and removed from queue.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!(profile as { is_admin?: boolean } | null)?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as BulkBody;
  if (!body.action || (body.action !== "approve" && body.action !== "reject")) {
    return NextResponse.json({ error: "action must be approve or reject" }, { status: 400 });
  }
  const scope = body.scope ?? "selected";
  const ids = Array.isArray(body.ids) ? body.ids.filter((s) => typeof s === "string") : [];
  if (scope === "selected" && ids.length === 0) {
    return NextResponse.json({ error: "ids[] required for selected scope" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const patch: Record<string, unknown> = body.action === "approve"
    ? {
        requires_curation: false,
        curated_by: user.id,
        curated_at: now,
      }
    : {
        status: "expired",
        requires_curation: false,
        curated_by: user.id,
        curated_at: now,
        rejection_reason: (body.rejection_reason ?? "Rejected during bulk curation").slice(0, 500),
      };

  let q = admin.from("marketplace_leads").update(patch).select("id");

  if (scope === "all_pending") {
    q = q.eq("requires_curation", true);
  } else {
    q = q.in("id", ids);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    ok: true,
    action: body.action,
    affected: data?.length ?? 0,
  });
}
