import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, Play, PartyPopper, Rocket, Sparkles, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Step {
  key: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  done: boolean;
  group: "setup" | "growth" | "automation";
}

const GROUP_META: Record<Step["group"], { label: string; tone: string; icon: typeof Sparkles }> = {
  setup:      { label: "Get set up",      tone: "from-indigo-500 to-violet-500", icon: Rocket },
  growth:     { label: "Bring in leads",  tone: "from-fuchsia-500 to-pink-500",  icon: Sparkles },
  automation: { label: "Automate",        tone: "from-emerald-500 to-teal-500",  icon: Trophy },
};

export default async function OnboardingPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: profile },
    { count: leadCount },
    { count: customerCount },
    { count: jobCount },
    { count: webhookLeadCount },
    { count: bookingSlotCount },
    { count: ruleCount },
    { count: referralCount },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("leads").select("id", { count: "exact", head: true }),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("jobs").select("id", { count: "exact", head: true }),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("source", "Website form"),
    supabase.from("booking_slots").select("id", { count: "exact", head: true }),
    supabase.from("auto_bid_rules").select("id", { count: "exact", head: true }),
    supabase.from("referral_codes").select("id", { count: "exact", head: true }),
  ]);

  const p = profile as Record<string, unknown> | null;

  const steps: Step[] = [
    {
      key: "profile",
      title: "Set up your public profile",
      body: "Business name, headline, services, service area, license info. This is what homeowners see in the directory and on your local SEO pages.",
      href: "/profile", cta: "Edit profile", group: "setup",
      done: Boolean(p?.business_name && (p?.headline || (Array.isArray(p?.services) && (p.services as string[]).length > 0))),
    },
    {
      key: "publish",
      title: "Publish to the public directory",
      body: "Toggle 'Publish to directory' on your profile so homeowners find you at /pros.",
      href: "/profile", cta: "Open profile", group: "setup",
      done: Boolean(p?.is_published),
    },
    {
      key: "first_lead",
      title: "Create your first lead",
      body: "Click '+ New lead' or use AI quick-add — type 'John 555-1234 kitchen remodel' and Claude fills the form.",
      href: "/leads", cta: "Add a lead", group: "setup",
      done: (leadCount ?? 0) > 0,
    },
    {
      key: "customer",
      title: "Convert a lead into a customer + job",
      body: "On any lead's detail page, hit 'Convert to job' — it creates a customer and a scheduled job in one click.",
      href: "/leads", cta: "View leads", group: "setup",
      done: (customerCount ?? 0) > 0 && (jobCount ?? 0) > 0,
    },
    {
      key: "capture",
      title: "Share your capture form",
      body: "Every contractor gets a free public form at /l/<your-id>. Post it in Instagram bio, embed in your site, or drop in DMs.",
      href: "/lead-gen", cta: "Get your form URL", group: "growth",
      done: (webhookLeadCount ?? 0) > 0,
    },
    {
      key: "alerts",
      title: "Set up speed-to-lead alerts",
      body: "Add your Slack or Discord webhook on your profile — every new lead pings instantly. <5 min response = ~70% close rate.",
      href: "/profile", cta: "Add webhook", group: "growth",
      done: Boolean(p?.alert_webhook_url),
    },
    {
      key: "wallet",
      title: "Fund your marketplace wallet",
      body: "Top up with $25-250 to start claiming Reddit, permit, and homeowner-form leads instantly.",
      href: "/marketplace", cta: "Top up", group: "growth",
      done: ((p?.credit_cents as number | undefined) ?? 0) > 0,
    },
    {
      key: "auto_bid",
      title: "Turn on AI auto-bid",
      body: "Set criteria (service, ZIP, max price). AI buys qualifying leads while you sleep, up to your daily cap.",
      href: "/auto-bid", cta: "Create rule", group: "automation",
      done: (ruleCount ?? 0) > 0,
    },
    {
      key: "booking",
      title: "Publish open booking slots",
      body: "Add availability — homeowners self-book estimate visits, no email back-and-forth.",
      href: "/booking", cta: "Add slots", group: "automation",
      done: (bookingSlotCount ?? 0) > 0,
    },
    {
      key: "referral",
      title: "Generate your first referral code",
      body: "Every closed customer gets a $50 code to share. Both sides earn credit when their referral books.",
      href: "/referrals", cta: "Create code", group: "automation",
      done: (referralCount ?? 0) > 0,
    },
    {
      key: "lsa",
      title: "Apply for Google Local Service Ads",
      body: "Highest-ROI paid channel. Google Guaranteed badge. ~45 min of setup, leads start in ~1 week.",
      href: "/lsa-setup", cta: "Setup playbook", group: "growth",
      done: false,
    },
    {
      key: "partnerships",
      title: "Apply to 3 partnerships",
      body: "Realtor board, BNI chapter, Home Depot Pro. 20+ programs with direct apply links.",
      href: "/partnerships", cta: "See partnerships", group: "growth",
      done: false,
    },
  ];

  const done = steps.filter((s) => s.done).length;
  const pct = Math.round((done / steps.length) * 100);
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const dashOffset = circ * (1 - pct / 100);
  const isComplete = pct === 100;

  const groups: Step["group"][] = ["setup", "growth", "automation"];

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Hero with progress ring */}
      <header className="relative card p-7 sm:p-9 overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-gradient opacity-20 blur-3xl animate-pulse-soft" />
        <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 opacity-15 blur-3xl" />
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-7">
          <div className="flex-1 min-w-0">
            <span className="section-eyebrow">
              <Sparkles className="h-3.5 w-3.5" /> Personalized setup
            </span>
            <h1 className="mt-3 display-h2">
              Let&apos;s get you to your <span className="gradient-text">first 100 leads</span>
            </h1>
            <p className="mt-3 lede max-w-xl">
              {steps.length} quick steps. Most contractors finish in under 30 minutes
              and have leads flowing in within a week.
            </p>
            <div className="mt-5 flex items-center gap-3 text-sm">
              <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200">
                <CheckCircle2 className="h-3 w-3 mr-1" /> {done} done
              </span>
              <span className="badge bg-ink-100 text-ink-600 ring-ink-200">
                {steps.length - done} to go
              </span>
            </div>
          </div>
          <ProgressRing pct={pct} circ={circ} dashOffset={dashOffset} radius={radius} />
        </div>
        {isComplete && (
          <div className="relative mt-6 flex items-center gap-2 text-sm font-medium text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl ring-1 ring-inset ring-emerald-200">
            <PartyPopper className="h-4 w-4" />
            You&apos;re all set up. Time to focus on closing deals.
          </div>
        )}
      </header>

      {groups.map((g) => {
        const list = steps.filter((s) => s.group === g);
        const meta = GROUP_META[g];
        const Icon = meta.icon;
        const groupDone = list.filter((s) => s.done).length;
        return (
          <section key={g}>
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${meta.tone} text-white shadow-glow`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="flex-1">
                <h2 className="section-title">{meta.label}</h2>
                <p className="text-xs text-ink-500">{groupDone} of {list.length} complete</p>
              </div>
            </div>
            <ol className="space-y-3">
              {list.map((s, i) => (
                <li
                  key={s.key}
                  className={`card p-5 flex items-start gap-4 transition-all ${
                    s.done ? "bg-emerald-50/40 border-emerald-100" : "card-hover"
                  }`}
                >
                  <div className="shrink-0 pt-0.5">
                    {s.done
                      ? <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      : <Circle className="h-6 w-6 text-ink-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-ink-400 font-mono">{String(i + 1).padStart(2, "0")}</span>
                      <h3 className={`font-semibold tracking-tight ${s.done ? "text-ink-500 line-through decoration-emerald-400/50" : "text-ink-900"}`}>
                        {s.title}
                      </h3>
                    </div>
                    <p className="mt-1.5 text-sm text-ink-600 leading-relaxed">{s.body}</p>
                    {!s.done && (
                      <Link href={s.href} className="btn-primary !py-1.5 !px-3.5 text-xs mt-3 inline-flex">
                        {s.cta} <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <VideoSection videos={(p?.onboarding_videos as { title: string; youtube_id: string }[] | null) ?? []} />
    </div>
  );
}

function ProgressRing({
  pct, circ, dashOffset, radius,
}: { pct: number; circ: number; dashOffset: number; radius: number }) {
  const size = (radius + 8) * 2;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="progress-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="#e2e8f0" strokeWidth="10" fill="none"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="url(#progress-grad)" strokeWidth="10" fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 700ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold gradient-text">{pct}%</span>
        <span className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">complete</span>
      </div>
    </div>
  );
}

function VideoSection({ videos }: { videos: { title: string; youtube_id: string }[] }) {
  return (
    <section className="card p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title flex items-center gap-2">
          <Play className="h-4 w-4 text-brand-600" /> Video walkthroughs
        </h2>
        <Link href="/onboarding/videos" className="btn-secondary !py-1.5 text-xs">
          Manage videos
        </Link>
      </div>
      {videos.length === 0 ? (
        <p className="text-sm text-ink-500 mt-2">
          No videos yet. <Link href="/onboarding/videos" className="text-brand-600 font-medium">Paste YouTube URLs</Link> to embed your own walkthroughs.
        </p>
      ) : (
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {videos.map((v, i) => (
            <div key={`${v.youtube_id}-${i}`} className="space-y-1.5">
              <div className="aspect-video">
                <iframe
                  className="w-full h-full rounded-xl shadow-soft"
                  src={`https://www.youtube.com/embed/${v.youtube_id}`}
                  title={v.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="text-xs font-medium">{v.title}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
