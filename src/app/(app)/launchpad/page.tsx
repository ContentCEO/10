import Link from "next/link";
import { ArrowRight, Calendar, ExternalLink, Globe, MessageSquare, Rocket, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

export default async function LaunchpadDashboard() {
  await requireModule("cf-launchpad");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Profile holds the contractor's business info — used for the
  // "this is your site" preview later.
  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name,services,website")
    .eq("id", user!.id)
    .maybeSingle();

  const websiteStatus = {
    stage: "design" as "design" | "build" | "review" | "live",
    eta_days: 7,
    next_step: "Pick a color palette + upload 5 hero photos",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <span className="section-eyebrow"><Rocket className="h-3.5 w-3.5" /> Contractor Flow Launchpad</span>
        <h1 className="mt-2 display-h2">Your <em>agency dashboard</em></h1>
        <p className="mt-2 text-sm text-white/60">
          We build your website, run your Google + Meta ads, and report back monthly. You take the leads. Everything happens here.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/launchpad/website" className="card p-5 hover:ring-orange-400/40 transition group">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Globe className="h-5 w-5 text-orange-300 mb-2" />
              <h2 className="font-semibold text-white">Website</h2>
              <p className="text-xs text-white/60 mt-1">
                Stage: <span className="text-orange-200">{websiteStatus.stage}</span> · ETA {websiteStatus.eta_days} days
              </p>
              <p className="text-xs text-white/50 mt-1">Next: {websiteStatus.next_step}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-orange-300 transition" />
          </div>
        </Link>

        <Link href="/launchpad/ads" className="card p-5 hover:ring-orange-400/40 transition group">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <TrendingUp className="h-5 w-5 text-orange-300 mb-2" />
              <h2 className="font-semibold text-white">Ad campaigns</h2>
              <p className="text-xs text-white/60 mt-1">Google + Meta — last 30d</p>
              <p className="text-xs text-white/50 mt-1">Not yet linked. Connect your accounts here.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-orange-300 transition" />
          </div>
        </Link>

        <Link href="/launchpad/reports" className="card p-5 hover:ring-orange-400/40 transition group">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Calendar className="h-5 w-5 text-orange-300 mb-2" />
              <h2 className="font-semibold text-white">Monthly reports</h2>
              <p className="text-xs text-white/60 mt-1">Performance + recommendations</p>
              <p className="text-xs text-white/50 mt-1">First report posts at end of month 1.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-orange-300 transition" />
          </div>
        </Link>

        <Link href="/launchpad/messages" className="card p-5 hover:ring-orange-400/40 transition group">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <MessageSquare className="h-5 w-5 text-orange-300 mb-2" />
              <h2 className="font-semibold text-white">Messages</h2>
              <p className="text-xs text-white/60 mt-1">Direct line to Davi + the team</p>
              <p className="text-xs text-white/50 mt-1">Reply within one business day.</p>
            </div>
            <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-orange-300 transition" />
          </div>
        </Link>
      </section>

      <section className="card p-5">
        <h2 className="section-title">Your business</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">Business name</div>
            <div className="text-white mt-0.5">{profile?.business_name ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">Services</div>
            <div className="text-white mt-0.5">
              {Array.isArray(profile?.services) && profile?.services?.length
                ? (profile.services as string[]).join(", ")
                : "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">Current website</div>
            <div className="text-white mt-0.5">
              {profile?.website ? (
                <a href={profile.website} target="_blank" rel="noreferrer" className="text-orange-300 hover:underline inline-flex items-center gap-1">
                  {profile.website.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
                </a>
              ) : "—"}
            </div>
          </div>
        </div>
        <Link href="/profile" className="mt-4 inline-block text-xs text-orange-300 hover:underline">
          Update business info →
        </Link>
      </section>
    </div>
  );
}
