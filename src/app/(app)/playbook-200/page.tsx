import { Rocket, TrendingUp } from "lucide-react";

export const dynamic = "force-static";

interface Idea {
  num: number;
  title: string;
  body: string;
  volume: string;
  effort: "low" | "med" | "high";
  legal: "clean" | "consent-required" | "high-risk";
  category: string;
}

const IDEAS: Idea[] = [
  // === EXPAND EXISTING SCRAPERS ===
  { num: 1, title: "Add Springfield, Lowell, Brockton, Quincy permit pulls",
    body: "All four cities publish Socrata feeds. ~25 more permits/day combined.",
    volume: "25/day", effort: "low", legal: "clean", category: "Public records" },
  { num: 2, title: "Add MA Inspectional Services Department feeds (per town)",
    body: "Each MA town publishes ISD inspection data. 50+ feeds available.",
    volume: "40/day", effort: "med", legal: "clean", category: "Public records" },
  { num: 3, title: "Property transfer scraper for all 14 MA counties",
    body: "masslandrecords.com is county-by-county. Scrape one a week.",
    volume: "100+/day at full coverage", effort: "high", legal: "clean", category: "Public records" },
  { num: 4, title: "MA Division of Banks foreclosure registry",
    body: "Every MA foreclosure must be registered. Free public list.",
    volume: "10/day", effort: "low", legal: "clean", category: "Public records" },
  { num: 5, title: "Mass DOR (Dept of Revenue) tax lien filings",
    body: "Distressed property signal. Filed at county registry of deeds.",
    volume: "5/day", effort: "med", legal: "clean", category: "Public records" },

  // === HYPERLOCAL ADS ===
  { num: 6, title: "Google Search Ads with hyperlocal landing pages",
    body: "One ad group per service+town. 20 services × 30 towns = 600 ad groups.",
    volume: "50–100/day at full scale", effort: "high", legal: "clean", category: "Paid ads" },
  { num: 7, title: "Google Display retargeting on /find-pro visitors",
    body: "Anyone who lands on your site gets re-ads everywhere for 30 days.",
    volume: "Conversion lift", effort: "low", legal: "clean", category: "Paid ads" },
  { num: 8, title: "Facebook Lookalike Audiences from past wins",
    body: "Upload won-deal customer emails; Meta finds 1% lookalikes in MA.",
    volume: "Cuts CPL ~40%", effort: "low", legal: "clean", category: "Paid ads" },
  { num: 9, title: "Instagram local-influencer micro-partnerships",
    body: "MA home-influencers with 5k–50k followers will do paid posts for $200–$1000.",
    volume: "10–100/post", effort: "med", legal: "clean", category: "Social" },
  { num: 10, title: "TikTok organic from job-site videos",
    body: "Every job is content. Short clips of before/after with city tag.",
    volume: "Highly variable; potential viral", effort: "med", legal: "clean", category: "Social" },

  // === COMMUNITY / OUTREACH ===
  { num: 11, title: "Nextdoor business page + monthly post",
    body: "Free local business page. Post a project per week.",
    volume: "5/week", effort: "low", legal: "clean", category: "Community" },
  { num: 12, title: "MA Facebook 'Buy Nothing' + neighborhood group monitoring",
    body: "Manually monitor 5 local groups for 'anyone know a contractor?' posts.",
    volume: "3–10/week per group", effort: "med", legal: "consent-required", category: "Community" },
  { num: 13, title: "Local sub-Reddit AMA (one per MA town)",
    body: "Schedule monthly AMAs in r/boston, r/cambridgema, etc. Long-game trust.",
    volume: "5/AMA + brand", effort: "med", legal: "clean", category: "Community" },
  { num: 14, title: "Yard signs with QR code at every active job",
    body: "30 days of free advertising per job. QR → /local/<service>/<city> page.",
    volume: "1–3/job site", effort: "low", legal: "clean", category: "Offline" },
  { num: 15, title: "Truck wraps with QR + landing page",
    body: "Every drive is brand exposure. Track scans via UTM.",
    volume: "Low but compounding", effort: "med", legal: "clean", category: "Offline" },

  // === CONTENT ===
  { num: 16, title: "Programmatic local SEO pages — 600 combos",
    body: "20 services × 30 MA towns. Already built; just need to seed.",
    volume: "1–5/page/month", effort: "low", legal: "clean", category: "SEO" },
  { num: 17, title: "Town-specific cost guides",
    body: "'Kitchen remodel cost in Newton MA' — long-tail rankability.",
    volume: "5/page/month", effort: "med", legal: "clean", category: "SEO" },
  { num: 18, title: "Permit data dashboards as SEO bait",
    body: "Public-facing pages: '247 permits filed in Cambridge this month'. Backlinks.",
    volume: "Authority + backlinks", effort: "med", legal: "clean", category: "SEO" },
  { num: 19, title: "YouTube channel: 50 before/after walkthroughs",
    body: "Each video ranks for service-city queries on Google + YouTube.",
    volume: "Compounding", effort: "high", legal: "clean", category: "Content" },
  { num: 20, title: "Weekly local newsletter (Substack/Beehiiv)",
    body: "'Boston home reno scoop' — homeowner-targeted, sponsored by you.",
    volume: "10–20/issue", effort: "med", legal: "clean", category: "Content" },

  // === PARTNERSHIPS ===
  { num: 21, title: "Realtor 'preferred contractor' kit (5 realtors)",
    body: "Branded one-pager, COI, references. 1-hour pitch per realtor.",
    volume: "5–10/realtor/year", effort: "med", legal: "clean", category: "Partnerships" },
  { num: 22, title: "Interior designer + architect pipeline (10 firms)",
    body: "They design, you build. Designer brings the client.",
    volume: "10–20/year per firm", effort: "med", legal: "clean", category: "Partnerships" },
  { num: 23, title: "Home inspector referral net (20 inspectors)",
    body: "Every failed inspection = work. Inspectors refer trusted fixers.",
    volume: "1–3/month per inspector", effort: "med", legal: "clean", category: "Partnerships" },
  { num: 24, title: "Property manager pipeline (5 PMs)",
    body: "Repeat business. Multi-unit landlords need work weekly.",
    volume: "10+/month per PM", effort: "med", legal: "clean", category: "Partnerships" },
  { num: 25, title: "Real estate flipper / investor pipeline",
    body: "MA flippers do 5–20 houses/year. Each = $30–$100k of work.",
    volume: "Steady when you find one", effort: "med", legal: "clean", category: "Partnerships" },
  { num: 26, title: "Senior living downsize agent partnerships",
    body: "Aging-in-place specialists sell homes that need renovation pre-listing.",
    volume: "2–5/month per agent", effort: "med", legal: "clean", category: "Partnerships" },
  { num: 27, title: "Insurance restoration adjuster network",
    body: "Storm-damage claims. Adjusters refer trusted vendors. State Farm, Liberty Mutual, MAPFRE.",
    volume: "5–30/month at scale", effort: "high", legal: "clean", category: "Partnerships" },
  { num: 28, title: "BNI chapter membership (2 chapters)",
    body: "Weekly meetings, exclusive contractor slot per chapter.",
    volume: "20–50 closed/year", effort: "high", legal: "clean", category: "Partnerships" },
  { num: 29, title: "Hardware store partnerships (Home Depot Pro + Lowe's Pro)",
    body: "Walk-in customers asking 'know a contractor?' = referral.",
    volume: "5–20/year per store", effort: "low", legal: "clean", category: "Partnerships" },
  { num: 30, title: "Mortgage broker partnerships",
    body: "Brokers know who just closed on a house = renovation buyer.",
    volume: "3–10/month per broker", effort: "med", legal: "clean", category: "Partnerships" },

  // === MARKETPLACES / DIRECTORIES ===
  { num: 31, title: "Google Business Profile + 100 reviews push",
    body: "GBP is free; ranks above everything else local. Aggressive review campaign.",
    volume: "10–30/month at full optimization", effort: "med", legal: "clean", category: "Local SEO" },
  { num: 32, title: "Yelp business page + 20 reviews",
    body: "MA homeowners still use Yelp. Don't pay for ads; do organic.",
    volume: "5–15/month", effort: "low", legal: "clean", category: "Local SEO" },
  { num: 33, title: "Houzz Pro listing",
    body: "Houzz is huge in high-end MA market. Free listing + paid upgrades.",
    volume: "Variable", effort: "med", legal: "clean", category: "Local SEO" },
  { num: 34, title: "Angi / HomeAdvisor / Thumbtack accounts (as a buyer, not seller)",
    body: "Yes, even as a competitor. Watch their pricing + lead types.",
    volume: "Intel only", effort: "low", legal: "clean", category: "Strategy" },
  { num: 35, title: "Listing on every MA town's chamber-of-commerce vendor directory",
    body: "Lots of MA towns have free directories. SEO + trust.",
    volume: "Low but compounding", effort: "med", legal: "clean", category: "Local SEO" },

  // === AI + TECH MULTIPLIERS ===
  { num: 36, title: "AI estimator widget embedded on partner sites",
    body: "Already built at /embed/quote. Get 20 contractors to embed it on their sites.",
    volume: "5/site/month", effort: "low", legal: "clean", category: "AI" },
  { num: 37, title: "AI cost calculator backlinked from Reddit answers",
    body: "Answer 'how much does X cost in MA' on Reddit with our calculator URL.",
    volume: "Trickle but compounding", effort: "low", legal: "clean", category: "AI" },
  { num: 38, title: "Voice AI receptionist (Vapi/Bland) on missed calls",
    body: "Capture every after-hours call that today goes to voicemail and dies.",
    volume: "30-50% missed-call recovery", effort: "med", legal: "clean", category: "AI" },
  { num: 39, title: "AI competitor ad-spy via Meta Ad Library",
    body: "Public Meta Ad Library. Pull every MA-targeted home-service ad, study what's working.",
    volume: "Intel + creative ideas", effort: "low", legal: "clean", category: "AI" },
  { num: 40, title: "AI-translated landing pages (Spanish, Portuguese)",
    body: "MA has 800k Spanish speakers + huge Portuguese (Brockton, Fall River). Auto-translate all /local pages.",
    volume: "2x traffic potential", effort: "med", legal: "clean", category: "SEO" },

  // === EVENTS + OFFLINE ===
  { num: 41, title: "Massachusetts Home Show booth (Boston, March)",
    body: "Annual home show in Boston Convention Center. 25k attendees.",
    volume: "200+/weekend booth", effort: "high", legal: "clean", category: "Events" },
  { num: 42, title: "New England Home Show booth (Fall)",
    body: "Same circuit, different season.",
    volume: "100+/weekend", effort: "high", legal: "clean", category: "Events" },
  { num: 43, title: "Town fair / festival sponsorships",
    body: "$500–$5000 per fair. Local trust = local leads.",
    volume: "20–50/event", effort: "med", legal: "clean", category: "Events" },
  { num: 44, title: "Direct mail postcards to permit-filing addresses",
    body: "We have the addresses from the permit scraper. Print 1000 postcards = $500.",
    volume: "30–50 per drop", effort: "low", legal: "clean", category: "Offline" },
  { num: 45, title: "Door-knock teams in NOAA storm zones (within 48h)",
    body: "We pull storm zones automatically. Dispatch crew to canvass within 48 hours.",
    volume: "50+/storm day", effort: "med", legal: "clean", category: "Offline" },

  // === CONVERSION (more from same traffic) ===
  { num: 46, title: "Speed-to-lead < 5 min via Twilio auto-text",
    body: "Industry data: <5 min response = ~70% close vs 5% at 24h.",
    volume: "2–3x conversion lift", effort: "low", legal: "clean", category: "Conversion" },
  { num: 47, title: "Good / Better / Best proposal mode by default",
    body: "Already built. Pushes average ticket up 15–30%.",
    volume: "Revenue multiplier", effort: "low", legal: "clean", category: "Conversion" },
  { num: 48, title: "Embedded financing on every proposal over $5k",
    body: "Wisetack / Sunbit. Adds 'or $X/month' = close rate jump.",
    volume: "10–20% lift on big tickets", effort: "med", legal: "clean", category: "Conversion" },
  { num: 49, title: "Auto review-request 48h after job complete",
    body: "Already built. Push to 100+ reviews on Google → LSA ranking → cheaper leads.",
    volume: "Flywheel effect", effort: "low", legal: "clean", category: "Conversion" },
  { num: 50, title: "Referral program with $50/$50 split",
    body: "Already built. Every closed customer becomes a salesperson.",
    volume: "10–30% of pipeline at maturity", effort: "low", legal: "clean", category: "Conversion" },
];

const TONE: Record<Idea["effort"], string> = {
  low: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  med: "bg-amber-100 text-amber-700 ring-amber-200",
  high: "bg-rose-100 text-rose-700 ring-rose-200",
};
const EFFORT_LABEL: Record<Idea["effort"], string> = {
  low: "Low effort", med: "Medium", high: "High",
};
const LEGAL_TONE: Record<Idea["legal"], string> = {
  clean: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  "consent-required": "bg-amber-100 text-amber-700 ring-amber-200",
  "high-risk": "bg-rose-100 text-rose-700 ring-rose-200",
};

export default function Playbook200Page() {
  const byCategory: Record<string, Idea[]> = {};
  for (const i of IDEAS) {
    (byCategory[i.category] ||= []).push(i);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Rocket className="h-5 w-5 text-brand-600" /> 200 leads/day playbook
        </h1>
        <p className="text-sm text-slate-500">
          50 concrete, ranked ideas for scaling lead acquisition to 200+/day in
          Massachusetts. Color-coded by effort + legality. Combine 10–15 of these
          and you'll exceed the target.
        </p>
      </header>

      <section className="card p-5 bg-brand-50 border-brand-100">
        <h2 className="font-semibold flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-600" /> The math
        </h2>
        <p className="mt-2 text-sm text-slate-800">
          200/day = 6,000/month. Diversified mix: 60 from public records, 50 from
          paid ads, 30 from organic SEO, 30 from partnerships, 20 from social, 10
          from offline/events. Most contractors over-index on one channel and
          plateau. The 200/day target only works with breadth.
        </p>
      </section>

      {Object.entries(byCategory).map(([cat, ideas]) => (
        <section key={cat}>
          <h2 className="font-semibold mb-3">{cat}</h2>
          <ul className="grid md:grid-cols-2 gap-3">
            {ideas.map((i) => (
              <li key={i.num} className="card p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-gradient text-white text-xs font-bold shrink-0">
                    {i.num}
                  </span>
                  <h3 className="font-semibold text-sm">{i.title}</h3>
                </div>
                <p className="text-sm text-slate-700">{i.body}</p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="badge bg-slate-100 text-slate-700 ring-slate-200">{i.volume}</span>
                  <span className={`badge ${TONE[i.effort]}`}>{EFFORT_LABEL[i.effort]}</span>
                  <span className={`badge ${LEGAL_TONE[i.legal]}`}>
                    {i.legal === "clean" ? "Legal ✓" : i.legal === "consent-required" ? "Consent" : "High risk"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
