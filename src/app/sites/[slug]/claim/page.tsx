import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClaimForm } from "./ClaimForm";

interface Params { params: { slug: string } }
export const dynamic = "force-dynamic";

async function load(slug: string) {
  const supabase = createAdminClient();
  const { data: site } = await supabase
    .from("ao_sites").select("slug, prospect_id").eq("slug", slug).maybeSingle();
  if (!site) return null;
  const { data: prospect } = await supabase
    .from("ao_prospects").select("business_name, city, state").eq("id", site.prospect_id).single();
  return { site, prospect };
}

export default async function ClaimPage({ params }: Params) {
  const loaded = await load(params.slug);
  if (!loaded) return notFound();

  const oneTime = priceLabel(process.env.STRIPE_PRICE_OUTREACH_ONETIME_LABEL, "$497 one-time");
  const monthly = priceLabel(process.env.STRIPE_PRICE_OUTREACH_MONTHLY_LABEL, "$97/mo");
  const adMgmt  = priceLabel(process.env.STRIPE_PRICE_OUTREACH_ADMGMT_LABEL,  "$249/mo + 10% ad spend");

  return (
    <main className="min-h-screen bg-slate-50 py-16 px-5">
      <div className="mx-auto max-w-3xl">
        <Link href={`/sites/${params.slug}`} className="text-sm text-slate-600 hover:text-slate-900">
          ← Back to preview
        </Link>
        <h1 className="mt-4 text-3xl md:text-4xl font-bold">
          Claim the site we built for {loaded.prospect?.business_name}
        </h1>
        <p className="mt-3 text-slate-600">
          Pick a plan — we'll publish your site on your own domain, hand over the keys, and (if you want) run your Google &amp; Meta ads.
        </p>

        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <PlanCard
            slug={params.slug}
            plan="one_time"
            title="Own the site"
            price={oneTime}
            features={[
              "Site goes live on your domain",
              "All copy, design, SEO included",
              "Two rounds of revisions",
              "You own everything",
            ]}
            highlight={false}
          />
          <PlanCard
            slug={params.slug}
            plan="monthly"
            title="Site + hosting"
            price={monthly}
            features={[
              "Everything in 'Own the site'",
              "Hosting, updates, hands-on tweaks",
              "Monthly traffic & lead report",
              "Cancel any time",
            ]}
            highlight
          />
          <PlanCard
            slug={params.slug}
            plan="ad_management"
            title="Done-for-you ads"
            price={adMgmt}
            features={[
              "We run your Google + Meta ads",
              "Custom landing pages for each campaign",
              "Weekly optimization",
              "Monthly performance review",
            ]}
            highlight={false}
          />
        </div>

        <div className="mt-12 rounded-2xl bg-white border border-slate-200 p-8">
          <h2 className="text-xl font-bold">Want to talk first?</h2>
          <p className="mt-2 text-sm text-slate-600">
            Tell us your email and we'll send over a quick walkthrough of how this works.
          </p>
          <ClaimForm slug={params.slug} />
        </div>
      </div>
    </main>
  );
}

function priceLabel(env: string | undefined, fallback: string): string {
  return env && env.trim() ? env : fallback;
}

function PlanCard({
  slug, plan, title, price, features, highlight,
}: {
  slug: string;
  plan: "one_time" | "monthly" | "ad_management";
  title: string;
  price: string;
  features: string[];
  highlight: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-6 ${highlight ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-[1.02]" : "bg-white border-slate-200"}`}>
      <div className="font-semibold">{title}</div>
      <div className="mt-2 text-2xl font-bold">{price}</div>
      <ul className="mt-4 space-y-2 text-sm">
        {features.map((f, i) => <li key={i} className="flex gap-2"><span>✓</span><span>{f}</span></li>)}
      </ul>
      <ClaimForm slug={slug} plan={plan} buttonClass={highlight
        ? "mt-6 w-full rounded-lg bg-white text-slate-900 px-4 py-2 font-semibold hover:bg-slate-100"
        : "mt-6 w-full rounded-lg bg-slate-900 text-white px-4 py-2 font-semibold hover:bg-slate-800"} />
    </div>
  );
}
