import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import { TrendChart } from "@/components/TrendChart";
import type { CallRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: calls } = await supabase
    .from("calls")
    .select("id, title, prospect_name, score, close_probability, created_at")
    .order("created_at", { ascending: true })
    .returns<
      Pick<
        CallRow,
        "id" | "title" | "prospect_name" | "score" | "close_probability" | "created_at"
      >[]
    >();

  const list = calls ?? [];
  const scored = list.filter((c) => typeof c.score === "number") as Array<
    typeof list[number] & { score: number }
  >;
  const avg = scored.length
    ? Math.round(scored.reduce((s, c) => s + c.score, 0) / scored.length)
    : 0;
  const last5 = scored.slice(-5);
  const prev5 = scored.slice(-10, -5);
  const last5Avg = avg5(last5);
  const prev5Avg = avg5(prev5);
  const delta = last5Avg && prev5Avg ? last5Avg - prev5Avg : 0;
  const avgClose = scored.length
    ? Math.round(
        scored.reduce((s, c) => s + (c.close_probability ?? 0), 0) /
          scored.length,
      )
    : 0;

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-white">
              Welcome back{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-1 text-ink-400">
              Track your sales performance and analyze new calls.
            </p>
          </div>
          <Link href="/analyze" className="btn-primary">
            + Analyze new call
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Calls analyzed" value={String(list.length)} />
          <Stat label="Average score" value={avg ? `${avg}/100` : "—"} />
          <Stat
            label="Trend (last 5 vs prior 5)"
            value={delta === 0 ? "—" : `${delta > 0 ? "+" : ""}${delta}`}
            tone={delta > 0 ? "good" : delta < 0 ? "bad" : "neutral"}
          />
          <Stat label="Avg close probability" value={avgClose ? `${avgClose}%` : "—"} />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <h2 className="text-sm font-semibold text-ink-200">
              Score over time
            </h2>
            {scored.length >= 2 ? (
              <TrendChart
                points={scored.map((c) => ({
                  x: new Date(c.created_at).getTime(),
                  y: c.score,
                }))}
              />
            ) : (
              <div className="mt-6 rounded-md border border-dashed border-ink-700 p-8 text-center text-sm text-ink-400">
                Analyze at least 2 calls to see your improvement trend.
              </div>
            )}
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-ink-200">Recent calls</h2>
            <ul className="mt-3 divide-y divide-ink-700">
              {list.length === 0 ? (
                <li className="py-6 text-sm text-ink-400">
                  No calls yet.{" "}
                  <Link href="/analyze" className="text-brand-300">
                    Analyze your first call →
                  </Link>
                </li>
              ) : (
                list
                  .slice()
                  .reverse()
                  .slice(0, 8)
                  .map((c) => (
                    <li key={c.id} className="py-3">
                      <Link
                        href={`/analyze/${c.id}`}
                        className="flex items-center justify-between gap-3 hover:opacity-90"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">
                            {c.title || "Sales call"}
                          </div>
                          <div className="text-xs text-ink-400">
                            {c.prospect_name ? `${c.prospect_name} · ` : ""}
                            {new Date(c.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-semibold text-white">
                            {c.score ?? "—"}
                          </div>
                          <div className="text-[10px] uppercase tracking-wide text-ink-400">
                            score
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))
              )}
            </ul>
          </div>
        </div>
      </main>
    </>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good"
      ? "text-emerald-300"
      : tone === "bad"
        ? "text-red-300"
        : "text-white";
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-ink-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

function avg5(arr: { score: number }[]) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((s, c) => s + c.score, 0) / arr.length);
}
