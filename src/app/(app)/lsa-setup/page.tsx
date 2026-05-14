import Link from "next/link";
import { Award, CheckCircle2, ExternalLink, ShieldCheck } from "lucide-react";

export const dynamic = "force-static";

interface Step {
  num: number;
  title: string;
  body: React.ReactNode;
  link?: { href: string; label: string };
  time?: string;
}

const STEPS: Step[] = [
  {
    num: 1,
    title: "Confirm you're eligible",
    body: (
      <ul className="list-disc list-inside space-y-1">
        <li>Active US business serving an LSA-supported category. MA contractors are eligible for HVAC, roofing, plumbing, electrical, garage doors, locksmith, lawn care, house cleaning, foundation, siding, water damage, window cleaning, and more.</li>
        <li>Business is at least one year old, OR you have proof of experience.</li>
        <li>You can provide proof of liability insurance + business license + workers' comp (if employees).</li>
      </ul>
    ),
    link: { href: "https://ads.google.com/local-services-ads", label: "Check eligibility" },
    time: "5 min",
  },
  {
    num: 2,
    title: "Start your LSA application",
    body: (
      <ol className="list-decimal list-inside space-y-1">
        <li>Go to <strong>ads.google.com/local-services-ads</strong></li>
        <li>Click <strong>Get started</strong>. Sign in with the Google account you want tied to the business.</li>
        <li>Enter business name, service category, ZIP codes you serve.</li>
        <li>Set your weekly budget (start at $250–$500/week; you only pay per validated lead).</li>
      </ol>
    ),
    time: "10 min",
  },
  {
    num: 3,
    title: "Upload verification documents",
    body: (
      <ul className="list-disc list-inside space-y-1">
        <li><strong>MA Construction Supervisor License (CSL)</strong> or <strong>Home Improvement Contractor (HIC)</strong> registration — whichever applies to your trade.</li>
        <li><strong>Liability insurance COI</strong> — $1M minimum, sometimes $2M. Listed insurance carrier with your business name as insured.</li>
        <li><strong>Workers' comp</strong> if you have employees.</li>
        <li><strong>Owner's photo ID</strong> for background check.</li>
        <li>Bank statement / utility bill at business address to verify location.</li>
      </ul>
    ),
    time: "20 min",
  },
  {
    num: 4,
    title: "Background check (Pinkerton / Evident)",
    body: (
      <>
        <p>Every owner + employee who'll be on customer property gets background-checked. Google uses Pinkerton or Evident depending on category.</p>
        <p className="mt-2 text-sm text-slate-600">
          Pinkerton emails you a link, you answer demographic questions, and they
          run nationwide criminal records. <strong>Takes 3–5 business days.</strong>
        </p>
      </>
    ),
    time: "3–5 days (waiting)",
  },
  {
    num: 5,
    title: "License verification",
    body: (
      <p>
        Google double-checks your MA CSL or HIC registration directly with the state.
        It pulls your number against the public MA Office of Consumer Affairs registry.
        Mismatches = rejection. Make sure the license matches your business name exactly.
      </p>
    ),
    time: "2–3 days",
  },
  {
    num: 6,
    title: "Earn the 'Google Guaranteed' badge",
    body: (
      <>
        <p>
          Once all checks pass, your profile shows a green checkmark with{" "}
          <strong>Google Guaranteed</strong> below your business name. Google
          backs every lead with a money-back guarantee (up to $2,000 per claim),
          which is the entire reason this channel converts so well.
        </p>
        <p className="mt-2 text-sm text-slate-600">
          You're now live on Search above the regular ad results, in Maps, and in
          the "Local Services" panel on relevant searches.
        </p>
      </>
    ),
  },
  {
    num: 7,
    title: "Optimize after week 1",
    body: (
      <ul className="list-disc list-inside space-y-1">
        <li><strong>Reviews matter most.</strong> LSA ranks by review count + recency. Send every closed client a Google review link (use our Review Request panel).</li>
        <li><strong>Respond to every lead within 5 minutes.</strong> LSA tracks response time; slow responders get throttled.</li>
        <li><strong>Dispute bad leads.</strong> Spam calls, wrong service, out-of-area — request a refund in the LSA app within 30 days.</li>
        <li><strong>Tune budget by category.</strong> Some service types ($-per-lead) are 3–10× others. Watch the dashboard for first 30 days, then reallocate.</li>
      </ul>
    ),
    time: "Ongoing",
  },
  {
    num: 8,
    title: "Pipe leads into ContractorFlow",
    body: (
      <>
        <p>LSA leads come in via the Google Local Services app. To get them into our marketplace + your CRM automatically:</p>
        <ol className="mt-2 list-decimal list-inside space-y-1">
          <li>In the LSA app, tap a lead → <strong>Forward</strong> → <strong>Email a copy to my CRM</strong>.</li>
          <li>Set the forward-to address to your Zapier inbound parser.</li>
          <li>Zapier → POST to <code>/api/marketplace/webhook</code> with the lead JSON.</li>
          <li>Set <code>source_channel: "google_ads"</code> in the Zapier payload so it tracks alongside Google Search ads.</li>
        </ol>
      </>
    ),
    link: { href: "/integrations", label: "Get webhook URL" },
  },
];

export default function LSAGuidePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" /> Google Local Service Ads (LSA) setup
        </h1>
        <p className="text-sm text-slate-500">
          Step-by-step. Total active time ~45 minutes; total elapsed ~5–7 business days
          due to background checks and license verification.
        </p>
      </header>

      <section className="card p-6 bg-emerald-50 border-emerald-200">
        <h2 className="font-semibold flex items-center gap-2">
          <Award className="h-4 w-4 text-emerald-700" /> Why LSA beats regular Google Ads
        </h2>
        <ul className="mt-3 text-sm text-emerald-900 space-y-1 list-disc list-inside">
          <li>Pay-per-validated-lead (typically $20–$80 in MA), not per-click.</li>
          <li>Shows above all other Google ads on relevant searches.</li>
          <li><strong>Google Guaranteed</strong> badge raises consumer trust → 2–4× higher conversion than regular search ads.</li>
          <li>Lead exclusivity per searcher — Google sends the homeowner to 1 contractor, not 4 competing ones.</li>
          <li>Refundable bad leads (spam, out-of-area, wrong service).</li>
        </ul>
      </section>

      <ol className="space-y-3">
        {STEPS.map((s) => (
          <li key={s.num} className="card p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-white font-bold shrink-0">
                {s.num}
              </span>
              <h3 className="font-semibold flex-1">{s.title}</h3>
              {s.time && <span className="badge bg-slate-100 text-slate-600 ring-slate-200 text-xs">{s.time}</span>}
            </div>
            <div className="mt-3 text-sm text-slate-700">{s.body}</div>
            {s.link && (
              <Link href={s.link.href} target={s.link.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                className="mt-3 btn-secondary !py-1 text-xs inline-flex">
                {s.link.label} <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </li>
        ))}
      </ol>

      <section className="card p-6">
        <h2 className="font-semibold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> What success looks like
        </h2>
        <ul className="mt-3 text-sm text-slate-700 space-y-1 list-disc list-inside">
          <li><strong>Week 1–2:</strong> 1–5 leads/week. Pay $40–$80 each. Conversion rate ~30%.</li>
          <li><strong>Month 2:</strong> 5–15 leads/week once you have 10+ reviews. Conversion settles ~25%.</li>
          <li><strong>Month 3+:</strong> 20–50 leads/week if you actively manage budget + reviews. ~25–30% close rate, average ticket ~$5–15k = $25k–$200k/month in jobs.</li>
        </ul>
      </section>
    </div>
  );
}
