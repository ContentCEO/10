import { redirect } from "next/navigation";
import { Lightbulb, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOwnerEmail } from "@/lib/owner";
import { generateText } from "@/lib/ai";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
// Server timeout in seconds for the AI insights call.
export const maxDuration = 60;

interface LeadStat {
  source: string | null;
  status: string | null;
  service_type: string | null;
  trade_tag: string | null;
  price: number | null;
  ai_score: number | null;
  zip: string | null;
  created_at: string;
}

interface Insight {
  title: string;
  body: string;
  metric?: string;
}

interface InsightResponse {
  insights: Insight[];
  summary?: string;
}

async function analyzeWithClaude(leads: LeadStat[]): Promise<InsightResponse | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (leads.length < 5) return null;

  // Summarize to keep prompt small. Don't send raw PII.
  const byStatus: Record<string, number> = {};
  const bySource: Record<string, { count: number; won: number; revenue: number }> = {};
  const byTrade: Record<string, { count: number; won: number }> = {};
  const byZip: Record<string, { count: number; won: number }> = {};
  const byDow: Record<string, number> = {};

  for (const l of leads) {
    const s = l.status ?? "new";
    byStatus[s] = (byStatus[s] ?? 0) + 1;

    const src = l.source ?? "unknown";
    const srcB = bySource[src] ??= { count: 0, won: 0, revenue: 0 };
    srcB.count++;
    if (s === "won") {
      srcB.won++;
      srcB.revenue += l.price ?? 0;
    }

    const trade = l.trade_tag ?? "unknown";
    const tradeB = byTrade[trade] ??= { count: 0, won: 0 };
    tradeB.count++;
    if (s === "won") tradeB.won++;

    if (l.zip) {
      const zipB = byZip[l.zip] ??= { count: 0, won: 0 };
      zipB.count++;
      if (s === "won") zipB.won++;
    }

    const dow = new Date(l.created_at).getUTCDay();
    const dowLabel = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][dow];
    byDow[dowLabel] = (byDow[dowLabel] ?? 0) + 1;
  }

  const summaryPayload = {
    total_leads_90d: leads.length,
    by_status: byStatus,
    by_source_top: Object.entries(bySource).sort((a, b) => b[1].count - a[1].count).slice(0, 10),
    by_trade_top: Object.entries(byTrade).sort((a, b) => b[1].count - a[1].count).slice(0, 10),
    by_zip_top: Object.entries(byZip).sort((a, b) => b[1].won - a[1].won).slice(0, 10),
    by_day_of_week: byDow,
  };

  const prompt = `Analyze this 90-day lead-data summary for a Massachusetts contractor. Identify 4 to 6 concrete, actionable insights (each ~1 sentence) the owner could use to improve close rate or focus marketing. Be specific — call out exact source names, trades, zip codes, percentages.

Data:
${JSON.stringify(summaryPayload, null, 2)}

Return STRICT JSON with this shape, no markdown, no prose:
{ "summary": "2-sentence overall takeaway", "insights": [ { "title": "short headline", "body": "1-sentence specific recommendation", "metric": "optional stat like '68% close rate'" } ] }`;

  try {
    const raw = await generateText({
      system: "You are a senior growth analyst for home-services contractors. Output strict JSON only. No prose. No markdown fences.",
      user: prompt,
      maxTokens: 900,
    });
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    return JSON.parse(stripped) as InsightResponse;
  } catch {
    return null;
  }
}

export default async function InsightsPage() {
  await requireModule("cf-marketplace");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const admin = createAdminClient();
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: rows } = await admin
    .from("leads")
    .select("source,status,service_type,trade_tag,price,ai_score,created_at")
    .gte("created_at", since)
    .limit(5000);

  // For zip we'd need to add a join to customers or store on leads.
  // For now, leave zip out — keep the analysis on what we have.
  const leads = (rows ?? []).map((r) => ({ ...r, zip: null })) as LeadStat[];
  const insights = await analyzeWithClaude(leads);

  const totalWon = leads.filter((l) => l.status === "won").length;
  const totalLost = leads.filter((l) => l.status === "lost").length;
  const closeRate = totalWon + totalLost > 0 ? Math.round((totalWon / (totalWon + totalLost)) * 100) : 0;
  const wonRevenue = leads.reduce((s, l) => s + (l.status === "won" ? (l.price ?? 0) : 0), 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <span className="section-eyebrow"><Lightbulb className="h-3.5 w-3.5" /> Owner</span>
        <h1 className="mt-2 display-h2">Weekly <em>insights</em></h1>
        <p className="mt-2 text-sm text-white/60">
          Claude analyzes your last 90 days of leads to find what&apos;s working. Updates every time you reload the page.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Leads (90d)"   value={String(leads.length)} icon={TrendingUp} />
        <Tile label="Closed won"    value={String(totalWon)} icon={TrendingUp} />
        <Tile label="Close rate"    value={`${closeRate}%`} icon={TrendingUp} tone={closeRate >= 25 ? "ok" : "warn"} />
        <Tile label="Won revenue"   value={`$${wonRevenue.toLocaleString()}`} icon={TrendingUp} />
      </section>

      {insights === null ? (
        <section className="card p-6 text-center">
          <AlertCircle className="h-6 w-6 text-amber-300 mx-auto mb-2" />
          <div className="text-sm text-white/70">
            {!process.env.ANTHROPIC_API_KEY ? (
              <>AI insights require <code>ANTHROPIC_API_KEY</code> on Vercel.</>
            ) : leads.length < 5 ? (
              <>Not enough lead history yet — need at least 5 leads in the last 90 days. Check back after a few more come in.</>
            ) : (
              <>Couldn&apos;t generate insights right now. Try refreshing.</>
            )}
          </div>
        </section>
      ) : (
        <>
          {insights.summary && (
            <div className="card p-5 ring-1 ring-brand-400/30 bg-brand-500/[0.08]">
              <div className="text-[10px] uppercase tracking-wider text-brand-200 font-mono mb-1">Overall takeaway</div>
              <p className="text-base text-white leading-relaxed">{insights.summary}</p>
            </div>
          )}

          <section>
            <h2 className="section-title mb-3">Actionable insights</h2>
            <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {insights.insights.map((ins, i) => (
                <li key={i} className="card p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-500/15 ring-1 ring-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
                      <Lightbulb className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white">{ins.title}</div>
                      <p className="mt-1 text-sm text-white/70">{ins.body}</p>
                      {ins.metric && (
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 ring-1 ring-emerald-400/30 text-emerald-200 px-2.5 py-0.5 text-[10px] font-mono">
                          {ins.metric}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section className="card p-5">
        <div className="flex items-start gap-3 text-xs text-white/50">
          <Clock className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Insights regenerate on every page load (caches off). Heavy use will burn ~$0.02 of Anthropic tokens per refresh.
            Consider visiting this page weekly rather than continuously.
          </p>
        </div>
      </section>
    </div>
  );
}

function Tile({ label, value, icon: Icon, tone = "ok" }: { label: string; value: string; icon: typeof TrendingUp; tone?: "ok" | "warn" }) {
  return (
    <div className="card p-4 flex items-start gap-3">
      <div className={tone === "warn"
        ? "h-9 w-9 rounded-lg bg-amber-500/15 ring-1 ring-amber-400/30 flex items-center justify-center text-amber-300"
        : "h-9 w-9 rounded-lg bg-brand-500/15 ring-1 ring-brand-400/30 flex items-center justify-center text-brand-200"}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">{label}</div>
        <div className="text-2xl font-semibold text-white tabular-nums mt-0.5">{value}</div>
      </div>
    </div>
  );
}
