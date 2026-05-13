import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Plan 1 / A-2 — Bulk actions on leads.
// POST /api/leads/bulk  Body: { ids: string[], action: "set_status" | "delete", status?: string }

interface Body {
  ids?: unknown;
  action?: string;
  status?: string;
}

const VALID_STATUS = new Set(["new", "contacted", "estimate", "estimate_sent", "won", "lost"]);

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body || !Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "ids array required" }, { status: 400 });
  }
  const ids = body.ids.filter((x) => typeof x === "string") as string[];
  if (ids.length === 0) return NextResponse.json({ error: "no valid ids" }, { status: 400 });
  if (ids.length > 200) return NextResponse.json({ error: "max 200 ids per call" }, { status: 400 });

  if (body.action === "set_status") {
    if (!body.status || !VALID_STATUS.has(body.status)) {
      return NextResponse.json({ error: "status required" }, { status: 400 });
    }
    const { error, count } = await supabase
      .from("leads")
      .update({ status: body.status }, { count: "exact" })
      .in("id", ids)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, updated: count ?? 0 });
  }

  if (body.action === "delete") {
    const { error, count } = await supabase
      .from("leads")
      .delete({ count: "exact" })
      .in("id", ids)
      .eq("user_id", user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deleted: count ?? 0 });
  }

  return NextResponse.json({ error: "action must be set_status or delete" }, { status: 400 });
}
