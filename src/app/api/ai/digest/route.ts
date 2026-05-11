import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai";
import { LEAD_STATUS_LABELS, type Job, type Lead } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM = `You write Monday-morning business briefings for a contractor running a small CRM.
Style: warm, direct, in plain text (no markdown), under 130 words, ~4-5 short
sentences. Lead with one specific revenue number for the week. Then one
strength, one risk, and one concrete next-action the owner can take today.
Do not start with "Sure" or "Here is" — start with the briefing itself.`;

function ageDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    { data: newLeads },
    { data: wonLeads },
    { data: completedJobs },
    { data: openJobs },
    { data: staleLeads },
  ] = await Promise.all([
    supabase.from("leads").select("source,service_type,created_at,status").gte("created_at", weekAgo),
    supabase.from("leads").select("source,created_at").eq("status", "won").gte("updated_at", weekAgo),
    supabase.from("jobs").select("price,title,end_date,status").eq("status", "completed").gte("updated_at", weekAgo),
    supabase.from("jobs").select("title,status,start_date").in("status", ["scheduled", "in_progress"]),
    supabase.from("leads").select("name,status,updated_at,service_type").in("status", ["new","contacted","estimate_sent"]),
  ]);

  const weeklyRevenue = (completedJobs ?? []).reduce(
    (s, j: { price: number | null }) => s + (j.price ?? 0), 0,
  );

  const stale = ((staleLeads ?? []) as Pick<Lead, "name" | "status" | "updated_at" | "service_type">[])
    .filter((l) => ageDays(l.updated_at) >= 7)
    .slice(0, 5);

  const sources: Record<string, number> = {};
  for (const l of (newLeads ?? []) as Pick<Lead, "source">[]) {
    const s = l.source ?? "Unknown";
    sources[s] = (sources[s] ?? 0) + 1;
  }
  const topSource = Object.entries(sources).sort((a, b) => b[1] - a[1])[0] ?? null;

  const summary =
    `Last 7 days:
- New leads: ${newLeads?.length ?? 0}
- Won deals: ${wonLeads?.length ?? 0}
- Jobs completed: ${completedJobs?.length ?? 0}
- Revenue from completed jobs: $${weeklyRevenue.toFixed(0)}
- Open jobs in flight: ${openJobs?.length ?? 0}
- Top lead source: ${topSource ? `${topSource[0]} (${topSource[1]} leads)` : "—"}

Stale leads (no movement in ≥7 days):
${stale.length
      ? stale.map((l) => `- ${l.name} · ${LEAD_STATUS_LABELS[l.status]} · ${ageDays(l.updated_at)}d idle · ${l.service_type ?? "—"}`).join("\n")
      : "- none"}`;

  try {
    const text = await generateText({
      system: SYSTEM,
      user: summary,
      maxTokens: 350,
    });
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
