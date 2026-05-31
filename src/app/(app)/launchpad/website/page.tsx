import { Globe, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

const STAGES = [
  { key: "intake",  label: "Intake",         done: true,  blurb: "Collected your business info, photos, color preferences." },
  { key: "design",  label: "Design",         done: false, blurb: "Davi designs the layout. 2 revision rounds included." },
  { key: "build",   label: "Build",          done: false, blurb: "Code, copy, SEO schema, mobile-fast performance." },
  { key: "review",  label: "Your review",    done: false, blurb: "You approve before it goes live." },
  { key: "live",    label: "Live",           done: false, blurb: "Deployed to your custom domain with SSL." },
];

export default async function LaunchpadWebsite() {
  await requireModule("cf-launchpad");

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
          {STAGES.map((s) => (
            <li key={s.key} className="flex items-start gap-3">
              {s.done
                ? <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                : <Circle className="h-5 w-5 text-white/30 mt-0.5 shrink-0" />}
              <div className="min-w-0">
                <div className={s.done ? "text-white font-semibold" : "text-white/70 font-semibold"}>
                  {s.label}
                </div>
                <div className="text-xs text-white/50 mt-0.5">{s.blurb}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="section-title">Preview</h2>
        <p className="text-sm text-white/60">
          A live preview link will appear here once design is complete. You&apos;ll get email + SMS notification.
        </p>
        <div className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 p-6 text-center text-white/40 text-sm">
          Preview not ready yet
        </div>
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
