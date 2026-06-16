import { Globe, CheckCircle2, Circle, ExternalLink, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

const STAGE_ORDER = ["intake", "design", "build", "review", "live"] as const;
type Stage = typeof STAGE_ORDER[number];

const STAGE_META: Record<Stage, { label: string; blurb: string }> = {
  intake:  { label: "Intake",      blurb: "We collect your business info, photos, color preferences." },
  design:  { label: "Design",      blurb: "Davi designs the layout. 2 revision rounds included." },
  build:   { label: "Build",       blurb: "Code, copy, SEO schema, mobile-fast performance." },
  review:  { label: "Your review", blurb: "You approve before it goes live." },
  live:    { label: "Live",        blurb: "Deployed to your custom domain with SSL." },
};

interface ClientRow {
  stage: Stage | "paused" | "churned";
  website_url: string | null;
  preview_url: string | null;
}

export default async function LaunchpadWebsite() {
  await requireModule("cf-launchpad");

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("launchpad_clients")
    .select("stage,website_url,preview_url")
    .eq("user_id", user!.id)
    .maybeSingle();

  const client = row as ClientRow | null;
  const currentStage = client?.stage && STAGE_ORDER.includes(client.stage as Stage)
    ? (client.stage as Stage)
    : "intake";
  const currentIdx = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <span className="section-eyebrow"><Globe className="h-3.5 w-3.5" /> Launchpad</span>
        <h1 className="mt-2 display-h2">Your <em>website</em></h1>
        <p className="mt-2 text-sm text-white/60">
          Track the build, request revisions, and preview each stage before it ships.
        </p>
      </header>

      <section className="card p-5">
        <h2 className="section-title mb-4">Build progress</h2>
        <ol className="space-y-3">
          {STAGE_ORDER.map((s, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <li key={s} className="flex items-start gap-3">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                ) : active ? (
                  <Circle className="h-5 w-5 text-orange-300 mt-0.5 shrink-0 fill-orange-300/20" />
                ) : (
                  <Circle className="h-5 w-5 text-white/30 mt-0.5 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className={done || active ? "text-white font-semibold" : "text-white/70 font-semibold"}>
                    {STAGE_META[s].label}
                    {active && <span className="ml-2 inline-flex items-center rounded-full bg-orange-500/15 text-orange-200 ring-1 ring-orange-400/30 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider">In progress</span>}
                  </div>
                  <div className="text-xs text-white/50 mt-0.5">{STAGE_META[s].blurb}</div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Preview</h2>
        {client?.preview_url ? (
          <>
            <p className="text-sm text-white/60">Your design preview is ready. Open it and email Davi with revisions.</p>
            <a href={client.preview_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-semibold px-4 py-2.5 text-sm transition">
              <Eye className="h-4 w-4" /> Open preview <ExternalLink className="h-3 w-3" />
            </a>
          </>
        ) : currentStage === "live" && client?.website_url ? (
          <>
            <p className="text-sm text-white/60">Your site is live.</p>
            <a href={client.website_url} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2.5 text-sm transition">
              <Globe className="h-4 w-4" /> Visit {client.website_url.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
            </a>
          </>
        ) : (
          <>
            <p className="text-sm text-white/60">
              A live preview link will appear here once design is complete. You&apos;ll get email + SMS notification.
            </p>
            <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-6 text-center text-white/40 text-sm">
              Preview not ready yet
            </div>
          </>
        )}
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Request a change</h2>
        <p className="text-sm text-white/60">
          You get 2 revision rounds included in Foundation. Email Davi or use Messages.
        </p>
        <a href="/launchpad/messages" className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-300 hover:underline">
          Open messages <ExternalLink className="h-3 w-3" />
        </a>
      </section>
    </div>
  );
}
