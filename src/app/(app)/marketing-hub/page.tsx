import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Hash,
  Megaphone,
  Phone,
  Rocket,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PostGenerator } from "./PostGenerator";
import { HashtagFinder } from "./HashtagFinder";
import { TeamConnect } from "./TeamConnect";

export const dynamic = "force-dynamic";

const POSTING_TIMES = [
  { platform: "Instagram",  best: "11am–1pm + 7–9pm", days: "Wed, Fri" },
  { platform: "TikTok",     best: "6–10am + 7–11pm",  days: "Tue, Thu, Fri" },
  { platform: "Facebook",   best: "1–4pm",            days: "Wed, Thu" },
  { platform: "LinkedIn",   best: "8–10am + 5–6pm",   days: "Tue, Wed, Thu" },
];

export default async function MarketingHubPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles").select("business_name,services,service_cities,headline")
    .eq("id", user.id).single();
  const p = profile as {
    business_name?: string | null;
    services?: string[] | null;
    service_cities?: string[] | null;
    headline?: string | null;
  } | null;

  const businessName = p?.business_name ?? "your business";
  const defaultService = p?.services?.[0] ?? "general contractor";
  const defaultCity = p?.service_cities?.[0] ?? "";

  return (
    <div className="space-y-8 max-w-5xl">
      <header className="card p-7 sm:p-9 relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-gradient opacity-20 blur-3xl animate-pulse-soft" />
        <div className="absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-gradient-to-br from-fuchsia-400 to-pink-400 opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Megaphone className="h-3.5 w-3.5" /> Marketing hub</span>
          <h1 className="mt-2 display-h2">
            Get <span className="gradient-text">seen everywhere</span>, fill your pipeline.
          </h1>
          <p className="mt-3 lede max-w-2xl">
            AI-powered post generator, hashtag finder, content calendar, and a
            direct line to our marketing + sales team when you want hands-on help.
          </p>
        </div>
      </header>

      {/* AI post generator */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 text-white shadow-glow">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h2 className="section-title">AI post generator</h2>
            <p className="text-xs text-ink-500">Caption + hashtags for Instagram, TikTok, Facebook, LinkedIn — in seconds.</p>
          </div>
        </div>
        <PostGenerator
          businessName={businessName}
          defaultService={defaultService}
          defaultCity={defaultCity}
        />
      </section>

      {/* Hashtag finder */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-glow">
            <Hash className="h-4 w-4" />
          </span>
          <div>
            <h2 className="section-title">Hashtag finder</h2>
            <p className="text-xs text-ink-500">Top hashtags per platform — copy and paste into your posts.</p>
          </div>
        </div>
        <HashtagFinder defaultService={defaultService} defaultCity={defaultCity} />
      </section>

      {/* Best posting times */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-glow">
            <Calendar className="h-4 w-4" />
          </span>
          <div>
            <h2 className="section-title">Best posting times</h2>
            <p className="text-xs text-ink-500">Average across home-service categories — your audience may differ.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {POSTING_TIMES.map((t) => (
            <div key={t.platform} className="card p-4">
              <div className="text-sm font-semibold tracking-tight">{t.platform}</div>
              <div className="text-xs text-ink-500 mt-2">
                <div><span className="text-ink-700 font-medium">Best time:</span> {t.best}</div>
                <div><span className="text-ink-700 font-medium">Best days:</span> {t.days}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Connect with team */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-glow">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <h2 className="section-title">Want hands-on help?</h2>
            <p className="text-xs text-ink-500">Tell us what you need — sales calls, full marketing setup, ad management. We&apos;ll get back same day.</p>
          </div>
        </div>
        <TeamConnect />
      </section>

      {/* Existing playbooks links */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-glow">
            <Rocket className="h-4 w-4" />
          </span>
          <div>
            <h2 className="section-title">Playbooks</h2>
            <p className="text-xs text-ink-500">Step-by-step guides to grow.</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <PlaybookCard href="/playbook-200" icon={Rocket} title="200 leads / day"
            desc="The full lead-volume playbook." tone="from-fuchsia-500 to-pink-500" />
          <PlaybookCard href="/lsa-setup" icon={Star} title="Google LSAs"
            desc="Highest-ROI paid channel. Apply once." tone="from-blue-500 to-indigo-500" />
          <PlaybookCard href="/partnerships" icon={Users} title="Partnerships"
            desc="Realtor boards, BNI, supplier programs." tone="from-emerald-500 to-teal-500" />
          <PlaybookCard href="/grow" icon={BarChart3} title="Grow hub"
            desc="Every growth lever in one place." tone="from-indigo-500 to-violet-500" />
          <PlaybookCard href="/referrals" icon={Sparkles} title="Referrals"
            desc="Codes that pay both sides." tone="from-amber-500 to-orange-500" />
          <PlaybookCard href="/lead-gen" icon={Phone} title="Capture forms"
            desc="Your public form + Instagram bio link." tone="from-rose-500 to-pink-500" />
        </div>
      </section>
    </div>
  );
}

function PlaybookCard({
  href, icon: Icon, title, desc, tone,
}: {
  href: string; icon: typeof Sparkles; title: string; desc: string; tone: string;
}) {
  return (
    <Link href={href} className="card card-hover p-5 group block">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-glow`}>
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-3 font-semibold tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-ink-600">{desc}</p>
      <span className="mt-3 inline-flex items-center text-xs font-medium text-brand-600 gap-1 group-hover:gap-1.5 transition-all">
        Open <ArrowRight className="h-3 w-3" />
      </span>
    </Link>
  );
}
