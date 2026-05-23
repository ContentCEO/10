// Per Contractor Flow architecture brief Section 5: ALWAYS show three tiers
// side-by-side. Tier 2 (Foundation + Growth) is "Recommended". Never offer
// discounts or negotiate tier prices — adjust scope instead.

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClaimForm } from "./ClaimForm";

interface Params { params: { slug: string } }
export const dynamic = "force-dynamic";

async function load(slug: string) {
  const supabase = createAdminClient();
  const { data: site } = await supabase
    .from("cf_launchpad_sites").select("slug, prospect_id").eq("slug", slug).maybeSingle();
  if (!site) return null;
  const { data: prospect } = await supabase
    .from("cf_launchpad_prospects").select("business_name, city, state").eq("id", site.prospect_id).single();
  return { site, prospect };
}

export default async function ClaimPage({ params }: Params) {
  const loaded = await load(params.slug);
  if (!loaded) return notFound();

  return (
    <main className="min-h-screen bg-stone-50 py-16 px-5">
      <div className="mx-auto max-w-6xl">
        <Link href={`/preview/sites/${params.slug}`} className="text-sm text-stone-600 hover:text-stone-900">
          ← Back to preview
        </Link>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-stone-900 text-white px-3 py-1 text-xs font-semibold tracking-wider uppercase">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "#C44A26" }} />
          Contractor Flow Launchpad
        </div>
        <h1 className="mt-4 text-3xl md:text-4xl font-bold text-stone-900">
          Claim the site we built for {loaded.prospect?.business_name}
        </h1>
        <p className="mt-3 text-stone-600 max-w-2xl">
          Three tiers. Pick the one that matches where your business is right now.
          All include the custom site we just showed you — the difference is who
          drives the leads after launch.
        </p>

        <div className="mt-10 grid lg:grid-cols-3 gap-5">
          <PlanCard
            slug={params.slug}
            plan="foundation"
            badge={null}
            title="Foundation"
            price={<><span className="text-3xl">$1,997</span><span className="text-stone-500 text-base"> one-time</span></>}
            bestFor="Skeptical contractor, referral-based business, just needs credibility online."
            features={[
              "5-page custom website, mobile-fast",
              "Google Business Profile sync",
              "Contact form piping into CF CRM",
              "CF CRM free for the first 30 days",
              "14-day delivery, 2 revision rounds",
              "You own the site",
            ]}
            notIncluded={["Ad management", "Ongoing strategy"]}
          />
          <PlanCard
            slug={params.slug}
            plan="foundation_growth"
            badge="Recommended"
            title="Foundation + Growth"
            price={<><span className="text-3xl">$997</span><span className="text-white/60 text-base"> setup, then</span><br /><span className="text-3xl">$997</span><span className="text-white/60 text-base">/mo</span></>}
            bestFor="Contractor who knows they need leads and wants someone managing it."
            features={[
              "Everything in Foundation",
              "Google Ads management",
              "Meta Ads management",
              "Monthly performance report",
              "Monthly strategy call",
              "CF CRM included free for 6 months",
            ]}
            notIncluded={null}
            highlight
            commitment="6-month minimum"
          />
          <PlanCard
            slug={params.slug}
            plan="revenue_share"
            badge="Skin in the game"
            title="Revenue Share"
            price={<><span className="text-3xl">$497</span><span className="text-stone-500 text-base"> setup, then</span><br /><span className="text-3xl">$497</span><span className="text-stone-500 text-base">/mo + 8% of attributed revenue</span></>}
            bestFor="Contractor with high job tickets ($5K+) who wants aligned incentives."
            features={[
              "Everything in Foundation + Growth",
              "Skin-in-the-game pricing",
              "Revenue attribution via CF CRM lead source tags",
              "Tracked end-to-end through Stripe",
            ]}
            notIncluded={null}
            commitment="12-month minimum"
          />
        </div>

        <div className="mt-12 rounded-2xl bg-white border border-stone-200 p-8 max-w-2xl">
          <h2 className="text-xl font-bold text-stone-900">Want to talk first?</h2>
          <p className="mt-2 text-sm text-stone-600">
            Tell us your email and Davi will reach out personally to walk you through how each tier
            would work for your specific business.
          </p>
          <ClaimForm slug={params.slug} />
        </div>

        <p className="mt-6 text-xs text-stone-400">
          Pricing is fixed. Contractor Flow doesn't negotiate Launchpad tier prices — if budget is tight, we adjust scope inside Foundation instead of discounting.
        </p>
      </div>
    </main>
  );
}

function PlanCard({
  slug, plan, badge, title, price, bestFor, features, notIncluded, highlight, commitment,
}: {
  slug: string;
  plan: "foundation" | "foundation_growth" | "revenue_share";
  badge: string | null;
  title: string;
  price: React.ReactNode;
  bestFor: string;
  features: string[];
  notIncluded: string[] | null;
  highlight?: boolean;
  commitment?: string;
}) {
  const ringStyle = highlight ? { boxShadow: `0 0 0 2px #C44A26` } : undefined;
  return (
    <div
      className={`rounded-2xl border p-6 flex flex-col ${
        highlight ? "bg-stone-900 text-white border-stone-900" : "bg-white border-stone-200"
      }`}
      style={ringStyle}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`text-xs uppercase tracking-wider font-semibold ${highlight ? "text-white/70" : "text-stone-500"}`}>
          Tier {plan === "foundation" ? "1" : plan === "foundation_growth" ? "2" : "3"}
        </div>
        {badge && (
          <span
            className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full font-semibold text-white"
            style={{ backgroundColor: "#C44A26" }}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="text-2xl font-bold mb-2">{title}</div>
      <div className="leading-tight">{price}</div>
      {commitment && (
        <div className={`mt-2 text-xs ${highlight ? "text-white/60" : "text-stone-500"}`}>{commitment}</div>
      )}

      <p className={`mt-4 text-sm ${highlight ? "text-white/80" : "text-stone-600"}`}>
        <strong className={highlight ? "text-white" : "text-stone-900"}>Best for: </strong>{bestFor}
      </p>

      <ul className="mt-5 space-y-2 text-sm flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex gap-2">
            <span style={{ color: "#C44A26" }} className="font-bold">✓</span>
            <span>{f}</span>
          </li>
        ))}
        {notIncluded && notIncluded.map((f, i) => (
          <li key={`x${i}`} className={`flex gap-2 ${highlight ? "text-white/40" : "text-stone-400"}`}>
            <span>—</span>
            <span className="line-through">{f}</span>
          </li>
        ))}
      </ul>

      <ClaimForm
        slug={slug}
        plan={plan}
        buttonClass={
          highlight
            ? "mt-6 w-full rounded-lg px-4 py-2.5 font-semibold text-white"
            : "mt-6 w-full rounded-lg bg-stone-900 text-white px-4 py-2.5 font-semibold hover:bg-stone-800"
        }
        buttonStyle={highlight ? { backgroundColor: "#C44A26" } : undefined}
      />
    </div>
  );
}
