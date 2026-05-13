/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { redirect } from "next/navigation";
import { Camera, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface PhotoRow {
  id: string;
  job_id: string;
  url: string;
  caption: string | null;
  phase: "before" | "during" | "after" | null;
  taken_at: string;
}

const PHASE_TONE: Record<string, string> = {
  before: "bg-rose-100 text-rose-700 ring-rose-200",
  during: "bg-amber-100 text-amber-700 ring-amber-200",
  after:  "bg-emerald-100 text-emerald-700 ring-emerald-200",
};

export default async function PortfolioPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: photos }, { data: jobs }] = await Promise.all([
    supabase.from("job_photos")
      .select("id,job_id,url,caption,phase,taken_at")
      .eq("user_id", user.id)
      .order("taken_at", { ascending: false })
      .limit(120),
    supabase.from("jobs")
      .select("id,title")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const rows = (photos ?? []) as PhotoRow[];
  const jobMap = new Map((jobs ?? []).map((j: { id: string; title: string }) => [j.id, j.title]));

  // Group by phase for visual organization.
  const byPhase = {
    after:  rows.filter((p) => p.phase === "after"),
    during: rows.filter((p) => p.phase === "during"),
    before: rows.filter((p) => p.phase === "before"),
    none:   rows.filter((p) => !p.phase),
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Camera className="h-3.5 w-3.5" /> Operations · Portfolio</span>
          <h1 className="mt-2 display-h2">
            Your <em>before &amp; after</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Every job photo your crew uploads, organized by phase. Use the
            best ones in proposals, on your landing page, or in marketing.
          </p>
          <div className="mt-3 text-xs text-ink-500 inline-flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            <span className="tabular-nums font-mono">{rows.length}</span> photos across <span className="tabular-nums font-mono">{jobMap.size}</span> jobs
          </div>
        </div>
      </header>

      {rows.length === 0 ? (
        <section className="card p-10 text-center">
          <ImageIcon className="h-10 w-10 mx-auto text-ink-300 mb-3" />
          <h2 className="font-semibold mb-1">No photos yet</h2>
          <p className="text-sm text-ink-500 max-w-md mx-auto">
            Crew members can upload photos to any job via the job detail page.
            Once they do, before/during/after shots show up here.
          </p>
          <Link href="/jobs" className="btn-primary mt-4 inline-flex">
            Go to jobs →
          </Link>
        </section>
      ) : (
        <>
          {(["after", "during", "before", "none"] as const).map((phase) => {
            const list = byPhase[phase];
            if (list.length === 0) return null;
            const label = phase === "none" ? "Other" : phase.charAt(0).toUpperCase() + phase.slice(1);
            const tone = phase === "none" ? "bg-ink-100 text-ink-600 ring-ink-200" : PHASE_TONE[phase];
            return (
              <section key={phase} className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-base font-semibold">{label}</h2>
                  <span className={`badge ${tone}`}>{list.length}</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {list.map((p) => (
                    <Link key={p.id} href={`/jobs/${p.job_id}`}
                      className="group relative aspect-square rounded-xl overflow-hidden bg-ink-100 ring-1 ring-ink-200/70 transition-all hover:-translate-y-0.5 hover:ring-brand-300/70">
                      <img src={p.url} alt={p.caption ?? ""}
                        className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-xs text-white font-semibold truncate">
                          {jobMap.get(p.job_id) ?? "Job"}
                        </div>
                        {p.caption && (
                          <div className="text-[10px] text-white/80 truncate">{p.caption}</div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
}
