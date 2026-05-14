import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Smart pricing suggestion. Given a service_type, looks at the
// contractor's past won jobs in that category and returns
// recommended price range based on:
//   - median of won leads' price (the actual closing price)
//   - 25th–75th percentile range
//   - win rate at different price points (if data permits)
//
// GET /api/ai/price-suggest?service=Bathroom%20remodel

interface LeadRow {
  status: string;
  service_type: string | null;
  price: number | null;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(s.length - 1, Math.floor((s.length - 1) * p)));
  return s[idx];
}

export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const url = new URL(request.url);
  const service = url.searchParams.get("service");
  if (!service) return NextResponse.json({ error: "service param required" }, { status: 400 });
  const serviceLc = service.toLowerCase().trim();

  const { data: rows } = await supabase
    .from("leads")
    .select("status,service_type,price")
    .eq("user_id", user.id)
    .not("price", "is", null)
    .gt("price", 0);

  const leads = (rows ?? []) as LeadRow[];

  // Loose match: same service_type word stem.
  const matches = leads.filter((l) => {
    if (!l.service_type) return false;
    const lc = l.service_type.toLowerCase();
    return lc.includes(serviceLc) || serviceLc.includes(lc);
  });

  const won  = matches.filter((l) => l.status === "won").map((l) => l.price!);
  const lost = matches.filter((l) => l.status === "lost").map((l) => l.price!);

  if (won.length === 0) {
    return NextResponse.json({
      ok: true,
      service,
      sample_size: 0,
      message: `No past won jobs match "${service}" yet. Quote your normal price.`,
    });
  }

  const median_price = median(won);
  const p25 = percentile(won, 0.25);
  const p75 = percentile(won, 0.75);
  const max_price = Math.max(...won);
  const min_price = Math.min(...won);
  const avg_lost = lost.length > 0 ? lost.reduce((s, p) => s + p, 0) / lost.length : null;

  // Win rate by quartile of overall quote price (won + lost combined).
  const all = matches.map((l) => l.price!);
  const lowCut = percentile(all, 0.33);
  const highCut = percentile(all, 0.67);
  const lowBand  = matches.filter((l) => l.price! <= lowCut);
  const midBand  = matches.filter((l) => l.price! > lowCut && l.price! <= highCut);
  const highBand = matches.filter((l) => l.price! > highCut);
  const winRate = (band: LeadRow[]) => {
    const decided = band.filter((l) => l.status === "won" || l.status === "lost").length;
    return decided > 0 ? band.filter((l) => l.status === "won").length / decided : 0;
  };

  return NextResponse.json({
    ok: true,
    service,
    sample_size: matches.length,
    won_count: won.length,
    lost_count: lost.length,
    suggested: {
      conservative: Math.round(p25),
      median:       Math.round(median_price),
      aggressive:   Math.round(p75),
    },
    range: { min: Math.round(min_price), max: Math.round(max_price) },
    avg_lost_price: avg_lost != null ? Math.round(avg_lost) : null,
    win_rate_by_band: {
      low:  { cutoff_below: Math.round(lowCut),  win_rate: Number(winRate(lowBand).toFixed(2)) },
      mid:  { range: [Math.round(lowCut), Math.round(highCut)], win_rate: Number(winRate(midBand).toFixed(2)) },
      high: { cutoff_above: Math.round(highCut), win_rate: Number(winRate(highBand).toFixed(2)) },
    },
  });
}
