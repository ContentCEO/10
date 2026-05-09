import { notFound } from "next/navigation";
import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { createClient } from "@/lib/supabase/server";
import type { CallRow } from "@/lib/types";
import { ScoreRing } from "@/components/ScoreRing";
import { CopyButton } from "@/components/CopyButton";

export default async function CallResultPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("calls")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<CallRow>();

  if (error || !data) notFound();

  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/dashboard"
              className="text-xs text-ink-400 hover:text-ink-200"
            >
              ← Back to dashboard
            </Link>
            <h1 className="mt-1 text-2xl font-semibold text-white">
              {data.title || "Sales call analysis"}
            </h1>
            <p className="text-sm text-ink-400">
              {data.prospect_name ? `${data.prospect_name} · ` : ""}
              {data.job_type ? `${data.job_type} · ` : ""}
              {new Date(data.created_at).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="card md:col-span-1">
            <h2 className="text-sm font-semibold text-ink-200">Call score</h2>
            <div className="mt-4 flex items-center gap-4">
              <ScoreRing value={data.score ?? 0} />
              <div>
                <div className="text-3xl font-semibold text-white">
                  {data.score ?? "—"}
                  <span className="text-base font-normal text-ink-400">/100</span>
                </div>
                <div className="mt-1 text-xs uppercase tracking-wide text-ink-400">
                  {gradeLabel(data.score)}
                </div>
              </div>
            </div>
            <hr className="my-5 border-ink-700" />
            <h2 className="text-sm font-semibold text-ink-200">
              Close probability
            </h2>
            <div className="mt-2">
              <ProgressBar value={data.close_probability ?? 0} />
              <div className="mt-1 text-xs text-ink-400">
                Estimated chance this lead closes within 30 days.
              </div>
            </div>
          </div>

          <div className="card md:col-span-2">
            <h2 className="text-sm font-semibold text-ink-200">Summary</h2>
            <p className="mt-2 text-ink-200">
              {data.summary || "No summary generated."}
            </p>
            {data.next_steps && data.next_steps.length > 0 ? (
              <>
                <h3 className="mt-5 text-sm font-semibold text-ink-200">
                  Next steps (24-48h)
                </h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-200">
                  {data.next_steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          {data.strengths && data.strengths.length > 0 ? (
            <div className="card md:col-span-3">
              <h2 className="text-sm font-semibold text-ink-200">What you did well</h2>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {data.strengths.map((s, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.missed_opportunities && data.missed_opportunities.length > 0 ? (
            <div className="card md:col-span-3">
              <h2 className="text-sm font-semibold text-ink-200">
                Missed opportunities
              </h2>
              <div className="mt-3 space-y-3">
                {data.missed_opportunities.map((m, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-amber-500/20 bg-amber-500/5 p-4"
                  >
                    <div className="text-sm font-semibold text-amber-200">
                      {m.moment}
                    </div>
                    <p className="mt-1 text-sm text-ink-200">{m.what_happened}</p>
                    <div className="mt-3 rounded border border-ink-700 bg-ink-900 p-3">
                      <div className="text-xs uppercase tracking-wide text-ink-400">
                        Better response
                      </div>
                      <p className="mt-1 text-sm text-white">
                        {m.better_response}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data.objections && data.objections.length > 0 ? (
            <div className="card md:col-span-3">
              <h2 className="text-sm font-semibold text-ink-200">
                Objection handling
              </h2>
              <div className="mt-3 space-y-3">
                {data.objections.map((o, i) => (
                  <div
                    key={i}
                    className="rounded-md border border-ink-700 bg-ink-900 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-white">
                        "{o.objection}"
                      </div>
                      <span
                        className={`badge ${
                          o.rep_handled_well
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-red-500/20 text-red-200"
                        }`}
                      >
                        {o.rep_handled_well ? "Handled" : "Needs work"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-wide text-ink-400">
                      {o.category}
                    </div>
                    <div className="mt-3 rounded border border-ink-700 bg-ink-800 p-3">
                      <div className="text-xs uppercase tracking-wide text-ink-400">
                        Recommended response
                      </div>
                      <p className="mt-1 text-sm text-ink-200">
                        {o.recommended_response}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data.followup_email || data.followup_sms ? (
            <div className="card md:col-span-3">
              <h2 className="text-sm font-semibold text-ink-200">Follow-up drafts</h2>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {data.followup_email ? (
                  <div className="rounded-md border border-ink-700 bg-ink-900 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-wide text-ink-400">
                        Email
                      </div>
                      <CopyButton text={data.followup_email} />
                    </div>
                    <pre className="mt-2 whitespace-pre-wrap text-sm text-ink-200">
                      {data.followup_email}
                    </pre>
                  </div>
                ) : null}
                {data.followup_sms ? (
                  <div className="rounded-md border border-ink-700 bg-ink-900 p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase tracking-wide text-ink-400">
                        Text message
                      </div>
                      <CopyButton text={data.followup_sms} />
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-ink-200">
                      {data.followup_sms}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </>
  );
}

function gradeLabel(score: number | null) {
  if (score == null) return "Unscored";
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Solid";
  if (score >= 60) return "Average";
  if (score >= 40) return "Weak";
  return "Poor";
}

function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-700">
      <div
        className="h-full rounded-full bg-brand-500"
        style={{ width: `${pct}%` }}
      />
      <div className="mt-1 text-right text-xs text-ink-400">{pct}%</div>
    </div>
  );
}
