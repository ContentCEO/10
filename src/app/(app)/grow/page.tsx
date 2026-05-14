import Link from "next/link";
import {
  CalendarClock,
  CircleDollarSign,
  Compass,
  ExternalLink,
  Globe,
  Megaphone,
  Phone,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SOURCE_CHANNEL_LABELS, type LeadSourceChannel } from "@/lib/lead-intake";

export const dynamic = "force-dynamic";

type Counts = Record<LeadSourceChannel, { leads: number; sold: number }>;

const PLAYBOOKS: {
  channel: LeadSourceChannel;
  cost_per_lead: string;
  intent: "High" | "Medium" | "Low";
  setup_minutes: number;
  body: string;
  href: string;
}[] = [
  {
    channel: "google_ads",
    cost_per_lead: "$25–$80",
    intent: "High",
    setup_minutes: 60,
    body: "Search ads catch people actively looking. Use Lead Form Asset + bid by zip code. Aim for cost-per-lead ≤ 1/4 of average deal size.",
    href: "/integrations",
  },
  {
    channel: "meta_facebook",
    cost_per_lead: "$10–$40",
    intent: "Medium",
    setup_minutes: 45,
    body: "Use Lead Ads with Instant Forms. Target homeowners aged 35-65 in a 25-mile radius. Creative is everything — use before/after photos.",
    href: "/integrations",
  },
  {
    channel: "meta_instagram",
    cost_per_lead: "$15–$50",
    intent: "Medium",
    setup_minutes: 45,
    body: "Reels with before/after content perform best. Push Stories over feed for local service. Same Ads Manager as Facebook.",
    href: "/integrations",
  },
  {
    channel: "marketplace_form",
    cost_per_lead: "Free intake",
    intent: "Medium",
    setup_minutes: 5,
    body: "Drive traffic to /find-pro from SEO and social. Every submission lands in the marketplace where contractors claim leads with wallet credit.",
    href: "/marketplace",
  },
  {
    channel: "website_form",
    cost_per_lead: "Free",
    intent: "Medium",
    setup_minutes: 5,
    body: "Each contractor gets a /l/<id> capture page. Embed on your site footer, drop in Instagram bio, share via SMS.",
    href: "/lead-gen",
  },
  {
    channel: "webhook",
    cost_per_lead: "Varies",
    intent: "Medium",
    setup_minutes: 20,
    body: "Pipe in leads from Typeform, Jotform, third-party scrapers, BNI groups, lead-gen services. Map fields once in Zapier.",
    href: "/integrations",
  },
];

export default async function GrowPage() {
  const supabase = createClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data } = await supabase
    .from("marketplace_leads")
    .select("source_channel,status,price_cents,created_at")
    .gte("created_at", since);

  const counts: Counts = {
    google_ads: { leads: 0, sold: 0 },
    meta_facebook: { leads: 0, sold: 0 },
    meta_instagram: { leads: 0, sold: 0 },
    website_form: { leads: 0, sold: 0 },
    marketplace_form: { leads: 0, sold: 0 },
    webhook: { leads: 0, sold: 0 },
    manual: { leads: 0, sold: 0 },
    scraped: { leads: 0, sold: 0 },
  };
  let totalRevenue = 0;
  for (const r of (data ?? []) as { source_channel: LeadSourceChannel; status: string; price_cents: number }[]) {
    counts[r.source_channel].leads += 1;
    if (r.status === "sold") {
      counts[r.source_channel].sold += 1;
      totalRevenue += r.price_cents;
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-brand-600" /> Growth playbook
        </h1>
        <p className="text-sm text-slate-500">
          Where to spend marketing dollars, which channels actually convert, and what
          to build next to win more deals.
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-3">
        <Tile label="Last 30 days" value={String((data ?? []).length)}
          sub="Marketplace leads created" tone="from-indigo-500 to-violet-500" icon={Megaphone} />
        <Tile label="Sold leads"
          value={String(Object.values(counts).reduce((s, c) => s + c.sold, 0))}
          sub="Bought by contractors"
          tone="from-emerald-500 to-teal-500" icon={ShoppingCart} />
        <Tile label="Marketplace revenue"
          value={`$${(totalRevenue / 100).toFixed(0)}`}
          sub="Last 30 days · gross"
          tone="from-amber-500 to-orange-500" icon={CircleDollarSign} />
      </section>

      <section>
        <h2 className="font-semibold mb-3">Channel playbook</h2>
        <ul className="grid md:grid-cols-2 gap-4">
          {PLAYBOOKS.map((p) => {
            const c = counts[p.channel];
            return (
              <li key={p.channel} className="card p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <ChannelIcon channel={p.channel} />
                  <h3 className="font-semibold">{SOURCE_CHANNEL_LABELS[p.channel]}</h3>
                  <span className={`badge ml-auto ${
                    p.intent === "High" ? "bg-emerald-100 text-emerald-700 ring-emerald-200" :
                    p.intent === "Medium" ? "bg-amber-100 text-amber-700 ring-amber-200" :
                                            "bg-slate-100 text-slate-700 ring-slate-200"
                  }`}>{p.intent} intent</span>
                </div>
                <p className="text-sm text-slate-700">{p.body}</p>
                <dl className="grid grid-cols-3 gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <div>
                    <dt>Cost / lead</dt>
                    <dd className="font-medium text-slate-900">{p.cost_per_lead}</dd>
                  </div>
                  <div>
                    <dt>Setup</dt>
                    <dd className="font-medium text-slate-900">{p.setup_minutes} min</dd>
                  </div>
                  <div>
                    <dt>30d leads</dt>
                    <dd className="font-medium text-slate-900">
                      {c.leads} · {c.sold} sold
                    </dd>
                  </div>
                </dl>
                <Link href={p.href} className="btn-secondary text-xs !py-1 inline-flex">
                  Set up <ExternalLink className="h-3 w-3" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold flex items-center gap-2">
          <Compass className="h-4 w-4 text-brand-600" /> Top 5 levers for trade businesses
        </h2>
        <ol className="mt-3 space-y-2.5 text-sm text-slate-700 list-decimal list-inside">
          <li>
            <strong>Local SEO landing pages.</strong> One programmatic page per
            <em> service × city</em>. 200 pages × 1 lead/mo = 200 leads/mo on autopilot.
          </li>
          <li>
            <strong>Speed-to-lead under 5 minutes.</strong> First contact wins ~70% of
            deals. Connect Twilio so new leads get auto-acknowledged within 60 seconds.
          </li>
          <li>
            <strong>Reviews flywheel.</strong> Every completed job auto-prompts for a
            Google review (already built into the Review Request panel).
          </li>
          <li>
            <strong>Referral codes.</strong> Give every closed customer a code that
            credits them <em>and</em> their friend. Compounding word-of-mouth.
          </li>
          <li>
            <strong>Productized Good / Better / Best.</strong> Stop quoting from
            scratch. The tiered proposal generator boosts average deal size 15–30%.
          </li>
        </ol>
      </section>

      <section className="card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-emerald-600" />
          <h2 className="font-semibold">Voice AI receptionist (recommended setup)</h2>
        </div>
        <p className="text-sm text-slate-700">
          Missed calls = lost revenue. Every ringing phone should be picked up within 3
          rings — by a human if possible, by an AI agent otherwise. Setup paths:
        </p>
        <ul className="text-sm text-slate-700 space-y-1.5 list-disc list-inside">
          <li><strong>Vapi.ai</strong> — fastest setup. Builds a custom voice agent in
            minutes, forwards transcripts to webhooks. Point it at <code>/api/marketplace/webhook</code>.</li>
          <li><strong>Bland.ai</strong> — phone-number-first. Forward your existing
            number to Bland's, configure intent extraction, hook the lead into our generic webhook.</li>
          <li><strong>Retell</strong> — strong for outbound recall ("hey, you submitted a
            form on our site"). Pair with a Twilio number.</li>
        </ul>
        <p className="text-sm text-slate-500">
          Expect 1–2 hours of setup, ~$0.10/min in voice usage, and a real revenue
          lift inside 30 days. ContractorFlow ingests the leads either way.
        </p>
      </section>

      <section className="card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <CircleDollarSign className="h-4 w-4 text-emerald-600" />
          <h2 className="font-semibold">Embedded financing on proposals</h2>
        </div>
        <p className="text-sm text-slate-700">
          For deals over $5,000, offering "as low as $X/month" raises close rate and
          average ticket. Apply for a contractor partnership with one of:
        </p>
        <ul className="text-sm text-slate-700 space-y-1.5 list-disc list-inside">
          <li><strong>Wisetack</strong> — most contractor-friendly, monthly payments to homeowners, contractor gets paid up-front.</li>
          <li><strong>Sunbit</strong> — fast approvals, no credit-score hit for the customer.</li>
          <li><strong>Affirm Business</strong> — recognized brand, raises trust on bigger remodels.</li>
        </ul>
        <p className="text-sm text-slate-500">
          Each partner gives you a hosted "apply for financing" URL. Drop it in your
          <em> Stripe payment link</em> profile field — it'll show up on every invoice
          + proposal as "Pay now or finance."
        </p>
      </section>

      <section className="card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold">What we'd build next (your roadmap)</h2>
        </div>
        <ul className="text-sm text-slate-700 space-y-1.5 list-disc list-inside">
          <li>Programmatic local SEO landing pages — one per service × city.</li>
          <li>Email/SMS drip campaigns triggered by lead stage (we already have the
            schedule and dispatch — just need templates).</li>
          <li>Referral code system with auto-credit on close.</li>
          <li>Permit data ingestion (BuildFax, BuildZoom) — public-record scraping for
            high-intent renovation leads, US-only.</li>
          <li>Profitability heatmap: which job types actually pay you the most per hour.</li>
        </ul>
      </section>
    </div>
  );
}

function Tile({
  label, value, sub, tone, icon: Icon,
}: {
  label: string;
  value: string;
  sub: string;
  tone: string;
  icon: typeof Megaphone;
}) {
  return (
    <div className={`stat-tile bg-gradient-to-br ${tone}`}>
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-white/85">{label}</span>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
          <Icon className="h-4 w-4 text-white" />
        </span>
      </div>
      <div className="relative z-10 mt-3 text-3xl font-bold leading-none">{value}</div>
      <div className="relative z-10 mt-1 text-xs text-white/85">{sub}</div>
    </div>
  );
}

function ChannelIcon({ channel }: { channel: LeadSourceChannel }) {
  const cls = "h-5 w-5";
  switch (channel) {
    case "google_ads":       return <Globe className={`${cls} text-blue-600`} />;
    case "meta_facebook":    return <Globe className={`${cls} text-indigo-600`} />;
    case "meta_instagram":   return <Globe className={`${cls} text-pink-500`} />;
    case "marketplace_form": return <ShoppingCart className={`${cls} text-amber-600`} />;
    case "website_form":     return <Globe className={`${cls} text-emerald-600`} />;
    case "webhook":          return <Sparkles className={`${cls} text-slate-600`} />;
    default:                 return <Globe className={`${cls} text-slate-600`} />;
  }
}
