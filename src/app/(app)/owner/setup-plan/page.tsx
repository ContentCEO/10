import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { CheckCircle2, Circle, ExternalLink, AlertCircle, Clock, Target } from "lucide-react";
import { requireModule } from "@/lib/subscriptions";

export const dynamic = "force-dynamic";

interface Step {
  num: number;
  title: string;
  time: string;
  cost: string;
  leadsImpact: string;
  status: "done" | "todo" | "in_progress";
  href?: string;
  details: string[];
}

export default async function SetupPlanPage() {
  await requireModule("cf-marketplace");
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");

  const apiKeySet      = Boolean(process.env.BATCHDATA_API_KEY);
  const lobKeySet      = Boolean(process.env.LOB_API_KEY);
  const lobLive        = lobKeySet && !process.env.LOB_API_KEY?.startsWith("test_");
  const metaTokenSet   = Boolean(process.env.META_PAGE_ACCESS_TOKEN);
  const cronSecretSet  = Boolean(process.env.CRON_SECRET ?? process.env.WEBHOOK_SECRET);

  const steps: Step[] = [
    {
      num: 1, title: "Fix the domain (Namecheap → Vercel DNS)",
      time: "30 min", cost: "$0", leadsImpact: "Required for everything",
      status: "todo",
      details: [
        "Log in to Namecheap → Domain List → Manage contractorflowstore.com",
        "Set Nameservers to 'Namecheap BasicDNS' (NOT Premium DNS or custom)",
        "Advanced DNS tab → delete any URL Redirect Record or CNAME pointing to parkingpage.namecheap.com",
        "Add: A Record · Host @ · Value 76.76.21.21 · TTL Auto",
        "Add: CNAME · Host www · Value cname.vercel-dns.com. (trailing dot)",
        "Save. Back in Vercel → Project → Settings → Domains, click Refresh on contractorflowstore.com",
        "Wait 5-30 min. Once green, SSL provisions automatically (~2 min more)",
        "Last: add NEXT_PUBLIC_APP_URL=https://contractorflowstore.com to Vercel env vars and redeploy",
      ],
    },
    {
      num: 2, title: "Fund BatchData ($25 minimum)",
      time: "5 min", cost: "$25", leadsImpact: "Enables permits → postcard pipeline",
      status: apiKeySet ? "in_progress" : "todo",
      href: "https://dashboard.batchdata.com/billing",
      details: [
        apiKeySet ? "✓ BATCHDATA_API_KEY env var is set" : "✗ BATCHDATA_API_KEY env var is NOT set — set it first",
        "Log in to BatchData dashboard → Billing or Account Credits",
        "Top up $25 (gets ~165 phone lookups at $0.15 each)",
        "If you see 'Verification Required' banner, complete identity verification first (real-estate APIs require it)",
        "Confirm your plan includes the Skip Trace API — entry tiers sometimes only include property search",
        "Once funded, go to /owner/scrapers and click 'Test BatchData' — should flip from 403 to green",
      ],
    },
    {
      num: 3, title: "Apply for Google Local Service Ads",
      time: "30 min now, then 7-14 day wait", cost: "$0 to apply, ~$200/mo when live",
      leadsImpact: "4-12 verified phone leads/day at $200/mo",
      status: "todo",
      href: "https://ads.google.com/local-services-ads",
      details: [
        "Go to ads.google.com/local-services-ads → 'Get Started'",
        "Choose your service area: Massachusetts (your specific MA cities)",
        "Choose categories: General contractor, Handyman, House cleaner (whichever apply)",
        "Upload: MA contractor license + insurance certificate + owner ID (driver's license or passport)",
        "Google runs a background check (free, takes 7-14 days)",
        "When approved you get the 'Google Guaranteed' badge",
        "Set initial budget to $200/mo. You pay per verified phone call from MA homeowners",
      ],
    },
    {
      num: 4, title: "Set up Meta Lead Ads",
      time: "60 min", cost: "$10-25/day ($300-750/mo)",
      leadsImpact: "3-8 leads/day at $10/day; scales linearly",
      status: metaTokenSet ? "in_progress" : "todo",
      href: "/owner/meta-setup",
      details: [
        metaTokenSet ? "✓ META_PAGE_ACCESS_TOKEN is set" : "✗ Env vars not set — see /owner/meta-setup for the 3 vars needed",
        "Create or log in to developers.facebook.com → your Meta app",
        "Generate a long-lived Page Access Token with leads_retrieval scope",
        "Add 3 env vars in Vercel: META_VERIFY_TOKEN (any random string), META_APP_SECRET (from app settings), META_PAGE_ACCESS_TOKEN",
        "In Meta → Webhooks → subscribe to 'Page' object → leadgen field; paste the webhook URL from /owner/meta-setup",
        "Subscribe your business Facebook page to the app",
        "Build a Lead Form in Ads Manager (Instant Forms): full name, phone, city, 'What kind of work?' dropdown",
        "Launch a campaign: Leads objective, MA location, $10/day budget, your form attached",
        "Leads land in /marketplace within ~30 sec of submission",
      ],
    },
    {
      num: 5, title: "Fund Lob with live key",
      time: "15 min", cost: "$50+ (will burn ~$42/day at 50 postcards)",
      leadsImpact: "1-3 responses/day from MA permit mailings",
      status: lobLive ? "done" : lobKeySet ? "in_progress" : "todo",
      href: "/owner/lob-setup",
      details: [
        lobLive ? "✓ Live Lob key is set" : lobKeySet ? "Currently using TEST key — no real mail going out. Switch to live_*" : "✗ LOB_API_KEY not set",
        "If using test key now: confirm test postcards work via /owner/lob-setup",
        "Then: dashboard.lob.com → Billing → add payment method, deposit $50+ to wallet",
        "Generate a live_* key, replace LOB_API_KEY in Vercel, redeploy",
        "Confirm 8 env vars are set: LOB_API_KEY, LOB_FROM_NAME, LOB_FROM_LINE1, LOB_FROM_CITY, LOB_FROM_STATE, LOB_FROM_ZIP, LOB_OUTREACH_PHONE, LOB_OUTREACH_WEBSITE",
        "LOB_DAILY_CAP defaults to 50 — change if you want more/less per day",
        "Cron auto-fires every 6 hours and mails up to 50 postcards/day to MA permit holders",
      ],
    },
    {
      num: 6, title: "Optimize Google Business Profiles (BOTH companies)",
      time: "90 min", cost: "$0", leadsImpact: "2-5 organic leads/day (grows over 30-60 days)",
      status: "todo",
      href: "https://business.google.com",
      details: [
        "Separate profiles for A&C Construction and A&C Cleaning — manage at business.google.com",
        "Each profile: fill in EVERY field — categories (primary + secondary), services, hours, service-area towns, attributes",
        "Upload 20+ photos per profile — finished projects, crew, vehicles, before/after",
        "Turn ON GBP Messaging + Booking button",
        "Reply to every existing review within 24 hours (positive AND negative)",
        "Post a weekly GBP Post — before/after with a customer story, 'last week we…'",
        "Apply for 'best of' local awards (e.g. Concord Magazine, MetroWest community votes)",
        "Get to 50+ reviews per profile within 60 days — auto-review-request cron is already running",
      ],
    },
    {
      num: 7, title: "Share the /quote calculator everywhere",
      time: "30 min", cost: "$0", leadsImpact: "2-5 leads/day from organic + future SEO",
      status: "todo",
      href: "/quote",
      details: [
        "Public URL: contractorflowstore.com/quote (or /quote/kitchen-remodel, /quote/roofing, etc.)",
        "Add the URL to your Instagram bio, Facebook page, GBP website field, email signature",
        "Print 100 business cards with the URL + a QR code that points to /quote",
        "Each visitor who fills the form = Lane A opted-in lead = name+phone+zip+intent ✓ all four filter rules pass",
        "After Google indexes these pages (~2-4 weeks) they rank for '[trade] cost Massachusetts' searches",
      ],
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <span className="section-eyebrow"><Target className="h-3.5 w-3.5" /> Owner</span>
        <h1 className="mt-2 display-h2">Setup <em>plan</em></h1>
        <p className="mt-2 text-sm text-white/60">
          7 steps to hit 10–20 qualified MA leads per day. Do them in order. ~4 hours total, but step 3 has a 7-14 day waiting period so start that one today.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Steps total" value="7" />
        <Tile label="Hands-on time" value="~4 hrs" />
        <Tile label="Total cost / mo" value="~$500" />
        <Tile label="Target leads / day" value="10-20" tone="brand" />
      </section>

      <ol className="space-y-4">
        {steps.map((s) => (
          <li key={s.num} className="card p-5">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                {s.status === "done"
                  ? <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  : s.status === "in_progress"
                  ? <AlertCircle className="h-6 w-6 text-amber-300" />
                  : <Circle className="h-6 w-6 text-white/30" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <h2 className="font-serif text-xl text-white">
                    Step {s.num}. {s.title}
                  </h2>
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-white/40">
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {s.time}</span>
                    <span>·</span>
                    <span>{s.cost}</span>
                  </div>
                </div>
                <div className="mt-1 text-xs text-emerald-300/80 font-medium">{s.leadsImpact}</div>

                <ol className="mt-3 space-y-1.5 text-sm text-white/70 list-decimal pl-5">
                  {s.details.map((d, i) => (
                    <li key={i} className={d.startsWith("✓") ? "text-emerald-300" : d.startsWith("✗") ? "text-amber-300" : ""}>{d}</li>
                  ))}
                </ol>

                {s.href && (
                  <a href={s.href} target={s.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-300 hover:underline">
                    {s.href.startsWith("http") ? "Open in new tab" : "Open the page"} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>

      <section className="card p-5 space-y-2">
        <h2 className="section-title">Expected timeline</h2>
        <ul className="text-sm text-white/70 space-y-1.5 list-disc pl-5">
          <li><strong>Day 1 evening</strong> (4 hrs of your time): DNS fixed, BatchData funded, Meta Lead Ads running at $10/day, Lob live key, both GBPs optimized, LSA application submitted, /quote URL on socials.</li>
          <li><strong>Day 2:</strong> First Meta leads start coming in (2–5/day). Lob postcards mailed within 1–2 business days — recipients see them by day 4.</li>
          <li><strong>Day 7:</strong> Meta dialed in, GBP impressions climbing, postcards landing → 5–8/day total.</li>
          <li><strong>Day 14:</strong> Google LSA verification complete. Live phone calls from verified MA homeowners → +4–12/day. Total: 10–15/day.</li>
          <li><strong>Day 30:</strong> Organic SEO from /quote and GBP kicks in. Ad creatives optimized. Total: 15–25/day.</li>
        </ul>
      </section>

      <section className="card p-5 space-y-2">
        <h2 className="section-title">What&apos;s working in the code right now (no action needed)</h2>
        <ul className="text-sm text-white/70 space-y-1.5 list-disc pl-5">
          <li>11 MA-only scrapers running 24/7 on Vercel cron (permits, deeds, evictions, foreclosures, etc.)</li>
          <li>Mirror cron auto-pushes scraped leads into your /leads pipeline every 2 minutes</li>
          <li>Quality gate: name + phone + MA + contractor intent + 30-day freshness</li>
          <li>BatchData phone enrichment {apiKeySet ? "✓" : "⚠️"} {apiKeySet ? "wired" : "missing key"}</li>
          <li>Lob postcard cron firing every 6 hours {lobKeySet ? (lobLive ? "(LIVE)" : "(TEST mode)") : "(no key)"}</li>
          <li>Meta Lead Ads webhook {metaTokenSet ? "✓ live" : "⚠️ needs page token"} at /api/marketplace/meta</li>
          <li>Public /quote/[trade] calculator capturing name+phone+MA-zip+intent as Lane A leads</li>
          <li>Curation queue with bulk-import button at /admin/curation</li>
          <li>Auto-review request cron (every 10 min) for completed jobs</li>
          <li>Cron-secret auth {cronSecretSet ? "✓" : "⚠️"} {cronSecretSet ? "configured" : "missing"}</li>
        </ul>
      </section>
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "brand" }) {
  return (
    <div className={tone === "brand" ? "card p-4 bg-brand-500/10 ring-1 ring-brand-400/30" : "card p-4"}>
      <div className="text-[10px] uppercase tracking-wider text-white/50 font-mono">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "brand" ? "text-brand-100" : "text-white"}`}>{value}</div>
    </div>
  );
}
