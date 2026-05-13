import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Plan 1 / A-12 — AI lead value estimator.
// POST /api/ai/lead-value { service_type, city?, notes? }
//
// Uses the contractor's own historical won jobs of the same/similar service
// type to suggest a $ range. Falls back to a public regional average if the
// contractor doesn't have enough history yet.

interface Body { service_type?: string; city?: string; notes?: string; }

// Conservative MA / Northeast regional averages (per service).
// Used when the contractor doesn't have enough won-job history.
const REGIONAL_DEFAULTS: Record<string, { low: number; mid: number; high: number }> = {
  "bath_remodel":      { low:  6_000, mid: 14_000, high: 32_000 },
  "kitchen_remodel":   { low: 12_000, mid: 30_000, high: 70_000 },
  "roof_replace":      { low:  8_000, mid: 14_000, high: 28_000 },
  "deck_build":        { low:  4_000, mid:  9_000, high: 22_000 },
  "fence_install":     { low:  1_500, mid:  4_500, high: 12_000 },
  "interior_paint":    { low:  1_500, mid:  4_000, high: 12_000 },
  "panel_upgrade":     { low:  1_800, mid:  3_000, high:  6_500 },
  "hvac_install":      { low:  4_500, mid:  9_000, high: 18_000 },
  "siding":            { low:  6_000, mid: 12_000, high: 28_000 },
  "windows":           { low:  4_000, mid:  9_500, high: 22_000 },
  "flooring":          { low:  3_000, mid:  7_000, high: 18_000 },
  "concrete":          { low:  3_000, mid:  6_500, high: 14_000 },
};

function classifyService(s: string): keyof typeof REGIONAL_DEFAULTS | null {
  const t = s.toLowerCase();
  if (/bath/.test(t))     return "bath_remodel";
  if (/kitchen/.test(t))  return "kitchen_remodel";
  if (/roof/.test(t))     return "roof_replace";
  if (/deck/.test(t))     return "deck_build";
  if (/fence/.test(t))    return "fence_install";
  if (/paint/.test(t))    return "interior_paint";
  if (/electric|panel/.test(t)) return "panel_upgrade";
  if (/hvac|ac|furnace|heat pump|mini ?split/.test(t)) return "hvac_install";
  if (/siding/.test(t))   return "siding";
  if (/window/.test(t))   return "windows";
  if (/floor|tile|hardwood|carpet/.test(t)) return "flooring";
  if (/concrete|driveway|patio/.test(t))    return "concrete";
  return null;
}

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await request.json().catch(() => null) as Body | null;
  if (!body?.service_type) {
    return NextResponse.json({ error: "service_type required" }, { status: 400 });
  }
  const category = classifyService(body.service_type);

  // Pull this contractor's own historical won jobs in this category.
  let history: number[] = [];
  if (category) {
    const { data } = await supabase
      .from("jobs")
      .select("price")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .ilike("title", `%${body.service_type.split(" ")[0]}%`)
      .limit(50);
    history = (data ?? [])
      .map((j: { price: number | null }) => j.price ?? 0)
      .filter((p) => p > 0);
  }

  let suggestion: { low: number; mid: number; high: number; source: "history" | "regional" | "unknown" };

  if (history.length >= 5) {
    // Use the contractor's own quartiles.
    const sorted = [...history].sort((a, b) => a - b);
    const q1   = sorted[Math.floor(sorted.length * 0.25)];
    const med  = sorted[Math.floor(sorted.length * 0.50)];
    const q3   = sorted[Math.floor(sorted.length * 0.75)];
    suggestion = { low: q1, mid: med, high: q3, source: "history" };
  } else if (category) {
    suggestion = { ...REGIONAL_DEFAULTS[category], source: "regional" };
  } else {
    suggestion = { low: 2_000, mid: 6_000, high: 18_000, source: "unknown" };
  }

  return NextResponse.json({
    ok: true,
    service_type: body.service_type,
    category,
    suggestion,
    history_count: history.length,
  });
}
