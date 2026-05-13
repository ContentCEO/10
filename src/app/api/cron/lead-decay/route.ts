import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized as isAuthorized } from "@/lib/cron-auth";

export const runtime = "nodejs";

// Daily lead temperature decay. Leads cool off when nobody touches them.
// Each day untouched (and not won/lost) shaves a few points off ai_score.
// Floor at 10 so the lead never disappears entirely — it just sinks to
// the bottom of the AI-sort.
//
// Decay rates:
//   1-3 days untouched: -0 / day  (fresh, no penalty)
//   4-7 days:           -3 / day
//   8-14 days:          -5 / day
//   15+ days:           -7 / day
//
// Runs daily.

interface LeadRow {
  id: string;
  ai_score: number | null;
  updated_at: string;
  status: string;
}

function decayFor(ageDays: number): number {
  if (ageDays <= 3) return 0;
  if (ageDays <= 7) return 3;
  if (ageDays <= 14) return 5;
  return 7;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const now = Date.now();

  // Pull only active leads with a non-null score, max 2000/run.
  const { data: rows } = await admin
    .from("leads")
    .select("id,ai_score,updated_at,status")
    .not("status", "in", "(won,lost)")
    .not("ai_score", "is", null)
    .limit(2000);

  const leads = (rows ?? []) as LeadRow[];
  let decayed = 0;
  let unchanged = 0;
  let totalPointsLost = 0;

  for (const l of leads) {
    if (l.ai_score == null) continue;
    const ageDays = Math.floor((now - new Date(l.updated_at).getTime()) / 86_400_000);
    const drop = decayFor(ageDays);
    if (drop === 0) { unchanged++; continue; }

    const next = Math.max(10, l.ai_score - drop);
    if (next === l.ai_score) { unchanged++; continue; }

    // Direct UPDATE with only ai_score — leaves updated_at alone, so
    // next decay run still sees the original "last touched" time.
    await admin.from("leads")
      .update({ ai_score: next })
      .eq("id", l.id);

    decayed++;
    totalPointsLost += drop;
  }

  return NextResponse.json({
    ok: true,
    scanned: leads.length,
    decayed,
    unchanged,
    total_points_lost: totalPointsLost,
  });
}

export async function POST(request: Request) { return GET(request); }
