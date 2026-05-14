import { redirect } from "next/navigation";
import { MessageCircle, Smile, Frown, Meh } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface NpsRow { score: number; comment: string | null; created_at: string; }

export default async function SatisfactionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("nps_responses")
    .select("score,comment,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const responses = (rows ?? []) as NpsRow[];

  const promoters = responses.filter((r) => r.score >= 9);
  const passives  = responses.filter((r) => r.score >= 7 && r.score <= 8);
  const detractors = responses.filter((r) => r.score <= 6);
  const nps = responses.length > 0
    ? ((promoters.length - detractors.length) / responses.length) * 100
    : 0;

  // Monthly NPS for last 12 months.
  const now = new Date();
  const months: { label: string; nps: number; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const inMonth = responses.filter((r) => {
      const t = new Date(r.created_at).getTime();
      return t >= start.getTime() && t < end.getTime();
    });
    const m_promoters  = inMonth.filter((r) => r.score >= 9).length;
    const m_detractors = inMonth.filter((r) => r.score <= 6).length;
    const m_nps = inMonth.length > 0
      ? ((m_promoters - m_detractors) / inMonth.length) * 100
      : 0;
    months.push({
      label: start.toLocaleString("en-US", { month: "short" }),
      nps: m_nps,
      count: inMonth.length,
    });
  }

  // Recent verbatims
  const verbatims = responses.filter((r) => r.comment?.trim()).slice(0, 12);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><MessageCircle className="h-3.5 w-3.5" /> Growth · Satisfaction</span>
          <h1 className="mt-2 display-h2">
            Customer <em>satisfaction</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Your Net Promoter Score over time, plus the verbatim
            comments your customers left. Above 50 is excellent. Below
            0 means more detractors than promoters — that&apos;s a problem.
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Overall NPS" value={`${nps >= 0 ? "+" : ""}${nps.toFixed(0)}`}
              accent={nps >= 50} negative={nps < 0} />
        <Stat label="Promoters" value={String(promoters.length)} pct={responses.length} icon={<Smile className="h-3 w-3 text-emerald-600" />} />
        <Stat label="Passives"  value={String(passives.length)}  pct={responses.length} icon={<Meh   className="h-3 w-3 text-amber-600"   />} />
        <Stat label="Detractors" value={String(detractors.length)} pct={responses.length} icon={<Frown className="h-3 w-3 text-rose-600"    />} />
      </section>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3">12-month NPS trend</h2>
        <div className="space-y-1.5">
          {months.map((m, i) => {
            const width = Math.min(100, Math.abs(m.nps));
            const positive = m.nps >= 0;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-wider text-ink-500 font-mono w-8 shrink-0">{m.label}</span>
                <div className="flex-1 h-5 bg-ink-100 rounded-md overflow-hidden relative">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-ink-300" />
                  <div className={`h-full ${positive ? "ml-[50%] bg-emerald-400" : "mr-[50%] ml-auto bg-rose-400"}`}
                       style={{ width: `${width / 2}%` }} />
                </div>
                <span className="text-xs tabular-nums font-mono shrink-0 w-12 text-right">
                  {m.count > 0 ? `${m.nps >= 0 ? "+" : ""}${m.nps.toFixed(0)}` : "—"}
                </span>
                <span className="text-[10px] tabular-nums text-ink-400 shrink-0 w-6 text-right">
                  {m.count > 0 ? m.count : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Recent verbatims</h2>
        </div>
        {verbatims.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            No comments yet. They show up once customers leave one with their NPS rating.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {verbatims.map((r, i) => {
              const tone =
                r.score >= 9 ? "bg-emerald-100 text-emerald-700 ring-emerald-200" :
                r.score >= 7 ? "bg-amber-100 text-amber-700 ring-amber-200" :
                               "bg-rose-100 text-rose-700 ring-rose-200";
              return (
                <li key={i} className="px-4 py-3 flex items-start gap-3">
                  <span className={`badge ${tone} tabular-nums font-mono shrink-0`}>{r.score}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-800 italic">&ldquo;{r.comment}&rdquo;</p>
                    <div className="text-[10px] text-ink-500 mt-1 tabular-nums font-mono">
                      {new Date(r.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, pct, icon, accent, negative }: {
  label: string; value: string; pct?: number; icon?: React.ReactNode;
  accent?: boolean; negative?: boolean;
}) {
  return (
    <div className={`card p-4 ${accent ? "bg-gradient-to-br from-emerald-50 via-white to-white" : ""}`}>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold flex items-center gap-1">
        {icon}{label}
      </div>
      <div className={`mt-1 text-2xl tabular-nums font-mono ${
        accent ? "text-emerald-700" : negative ? "text-rose-700" : "text-ink-900"
      }`}>
        {value}
      </div>
      {typeof pct === "number" && pct > 0 && (
        <div className="text-[10px] text-ink-500 tabular-nums">
          {((Number(value) / pct) * 100).toFixed(0)}% of {pct}
        </div>
      )}
    </div>
  );
}
