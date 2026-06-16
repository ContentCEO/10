import Link from "next/link";
import { ArrowRight, Calendar, CircleDollarSign, ExternalLink, Globe, MessageSquare, Rocket, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

interface LaunchpadClient {
  id: string;
  business_name: string;
  city: string | null;
  tier: string | null;
  stage: "intake" | "design" | "build" | "review" | "live" | "paused" | "churned";
  website_url: string | null;
  preview_url: string | null;
  google_ads_customer_id: string | null;
  meta_ad_account_id: string | null;
  monthly_budget_cents: number;
  started_at: string;
  went_live_at: string | null;
}

// Days remaining from started_at given each stage's typical duration.
// These are the customer-facing ETA estimates, not contractual.
const STAGE_TOTAL_DAYS: Record<string, number> = {
  intake: 14, design: 10, build: 5, review: 2, live: 0, paused: 0, churned: 0,
};

const STAGE_BLURB: Record<string, string> = {
  intake:  "We're collecting your business info and project preferences.",
  design:  "Davi is designing your site. 2 revision rounds included.",
  build:   "Build in progress — code, copy, SEO, mobile performance.",
  review:  "Your preview is ready. Review and approve to go live.",
  live:    "Your site is live. We monitor + maintain it from here.",
  paused:  "Your project is currently on hold.",
  churned: "Project closed.",
};

const TIER_LABEL: Record<string, string> = {
  foundation:        "Foundation",
  foundation_growth: "Foundation + Growth",
  revenue_share:     "Revenue Share",
};

export default async function LaunchpadDashboard() {
  await requireModule("cf-launchpad");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("business_name,services,website")
    .eq("id", user!.id)
    .maybeSingle();

  const admin = createAdminClient();
  const { data: clientRow } = await admin
    .from("launchpad_clients")
    .select("id,business_name,city,tier,stage,website_url,preview_url,google_ads_customer_id,meta_ad_account_id,monthly_budget_cents,started_at,went_live_at")
    .eq("user_id", user!.id)
    .maybeSingle();

  const client = clientRow as LaunchpadClient | null;
  const stage = client?.stage ?? "intake";
  const etaDays = computeEta(client?.started_at, stage);
  const adsLinked = !!(client?.google_ads_customer_id || client?.meta_ad_account_id);

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <span className="section-eyebrow"><Rocket className="h-3.5 w-3.5" /> Contractor Flow Launchpad</span>
        <h1 className="mt-2 display-h2">Your <em>agency dashboard</em></h1>
        <p className="mt-2 text-sm text-white/60">
          We build your website, run your Google + Meta ads, and report back monthly. You take the leads. Everything happens here.
        </p>
      </header>

      {!client && (
        <section className="card p-5 bg-amber-500/[0.05] ring-amber-400/20">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-amber-300 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold text-amber-100">Kickoff hasn&apos;t started yet</div>
              <p className="text-sm text-white/70 mt-1">
                Davi will email you within one business day to schedule your kickoff call.
                Until then, the dashboard below shows what&apos;s coming.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/launchpad/website" className="card p-5 hover:ring-orange-400/40 transition group">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Globe className="h-5 w-5 text-orange-300 mb-2" />
              <h2 className="font-semibold text-white">Website</h2>
              <p className="text-xs text-white/60 mt-1">
                Stage: <span className="text-orange-200 capitalize">{stage}</span>
                {etaDays !== null && stage !== "live" && ` · ETA ${etaDays} day${etaDays === 1 ? "" : "s"}`}
              </p>
              <p className="text-xs text-white/50 mt-1">{STAGE_BLURB[stage]}</p>
              {stage === "live" && client?.website_url && (
                <a href={client.website_url} target="_blank" rel="noreferrer"
                  className="text-xs text-emerald-300 hover:underline inline-flex items-center gap-1 mt-1">
                  {client.website_url.replace(/^https?:\/\//, "")} <ExternalLink className="h-3 w-3" />
                </a>
              )}
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
              <p className="text-xs text-white/50 mt-1">
                {adsLinked
                  ? `${client?.google_ads_customer_id ? "Google" : ""}${client?.google_ads_customer_id && client?.meta_ad_account_id ? " + " : ""}${client?.meta_ad_account_id ? "Meta" : ""} connected.`
                  : "Not yet linked. Davi will request access during kickoff."}
              </p>
              {client?.monthly_budget_cents ? (
                <p className="text-xs text-white/40 mt-1">
                  Budget: ${(client.monthly_budget_cents / 100).toLocaleString()}/mo
                </p>
              ) : null}
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
        <h2 className="section-title">Your account</h2>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">Business</div>
            <div className="text-white mt-0.5">
              {client?.business_name ?? profile?.business_name ?? "—"}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">City</div>
            <div className="text-white mt-0.5">{client?.city ?? "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">Tier</div>
            <div className="text-white mt-0.5">{client?.tier ? TIER_LABEL[client.tier] ?? client.tier : "—"}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">Started</div>
            <div className="text-white mt-0.5">
              {client?.started_at ? new Date(client.started_at).toLocaleDateString() : "—"}
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

function computeEta(startedAt: string | undefined | null, stage: string): number | null {
  if (!startedAt) return null;
  const total = STAGE_TOTAL_DAYS[stage];
  if (!total) return null;
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 86_400_000);
  const remaining = Math.max(0, total - elapsed);
  return remaining;
}
