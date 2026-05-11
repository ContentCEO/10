import Link from "next/link";
import {
  Award, Building2, ExternalLink, Handshake, Phone, ShieldCheck, Sparkles, Store, Users,
} from "lucide-react";

export const dynamic = "force-static";

interface Program {
  name: string;
  description: string;
  link: string;
  fees: string;
  volume: string;
  setup: string;
}

const REALTOR_PROGRAMS: Program[] = [
  {
    name: "Massachusetts Association of REALTORS — Affiliate Membership",
    description: "Direct membership in MAR as a contractor affiliate. Gets you into local board events, sponsored mixers, and the annual MA REALTOR convention.",
    link: "https://www.marealtor.com/membership/affiliate",
    fees: "$200–$400/year",
    volume: "10–50 referrals/year per active relationship",
    setup: "Submit affiliate application, pay dues, attend one chapter event/month",
  },
  {
    name: "Greater Boston Real Estate Board",
    description: "Largest real estate board in New England. Affiliate slot opens up real-estate-pro DM access for the entire Boston metro.",
    link: "https://www.gbreb.com/Membership",
    fees: "$350/year affiliate",
    volume: "Highest in MA — ~10,000 active agents",
    setup: "Application + reference letter from a member agent",
  },
  {
    name: "RE/MAX preferred-vendor program",
    description: "RE/MAX franchises maintain office-level preferred-vendor lists. Get on one and listing agents push you for pre-list repairs.",
    link: "https://www.remax.com/contact-us",
    fees: "Free to join; some offices charge nominal fee",
    volume: "5–15 referrals/office/year",
    setup: "Contact each RE/MAX office's broker-owner directly. Bring W-9, COI, references.",
  },
  {
    name: "Compass Concierge contractor network",
    description: "Compass agents arrange and front-pay pre-listing improvements via Concierge. Approved contractors get priority.",
    link: "https://www.compass.com/concierge/",
    fees: "Free",
    volume: "Top tier — Compass dominates upper-end MA",
    setup: "Email Compass Concierge ops with portfolio + references",
  },
  {
    name: "Zillow Premier Agent partnerships",
    description: "Top Zillow agents in each ZIP often need contractors for their listings. Cold-email the top 3 in each MA town.",
    link: "https://www.zillow.com/premier-agent/",
    fees: "Free for you — agents pay Zillow",
    volume: "Highly variable",
    setup: "Build a vendor sheet, message top agents directly through Zillow contact form",
  },
  {
    name: "REDX / Vulcan7 partnerships",
    description: "Tools that real-estate agents use for expired listings. The agents using these are aggressive — partner up.",
    link: "https://www.redx.com/",
    fees: "Free for you",
    volume: "Niche but active",
    setup: "Reach out through your existing realtor network",
  },
  {
    name: "BNI (Business Networking International)",
    description: "Weekly structured-referral chapters. Only one contractor per category per chapter, so it's exclusive within that group.",
    link: "https://www.bni.com/find-a-chapter",
    fees: "$1,000–$2,000/year per chapter",
    volume: "20–50 closed deals/year per active chapter",
    setup: "Visit a chapter as a guest, apply for the open contractor seat",
  },
  {
    name: "MA Chamber of Commerce (your town)",
    description: "Every MA town has a chamber. Pay dues, sponsor an event, get listed on their preferred-vendor page.",
    link: "https://acce.org/find-a-chamber/",
    fees: "$300–$1,200/year",
    volume: "Town-specific",
    setup: "Apply online; show up to the next monthly mixer",
  },
];

const INSURANCE_PROGRAMS: Program[] = [
  {
    name: "MAPFRE Preferred Contractor Network (MA-specific)",
    description: "MA's largest auto + home insurer. Approved contractors get claim assignments directly.",
    link: "https://www.mapfreinsurance.com/insurance/agent-tools",
    fees: "Free",
    volume: "Steady, claim-driven",
    setup: "Apply for vendor status through MAPFRE business development",
  },
  {
    name: "State Farm Premier Service Program",
    description: "State Farm's national approved-contractor list. Storm-damage referrals after every claim.",
    link: "https://www.statefarm.com/claims/insurance-resources/premier-service-program",
    fees: "Free",
    volume: "5–30 referrals/month per market",
    setup: "Application + 5 years claims experience + COI + background check",
  },
  {
    name: "Liberty Mutual Approved Vendor",
    description: "HQ'd in Boston. MA contractors well-positioned. Auto-insurance claims drive auto-body-style work, but property claims pull in roofers + restoration too.",
    link: "https://business.libertymutual.com/",
    fees: "Free",
    volume: "Strong in MA",
    setup: "Reach out to a Liberty Mutual MA claims office",
  },
  {
    name: "Allstate Good Hands Repair Network",
    description: "Property side. Mostly storm + water damage referrals.",
    link: "https://www.allstate.com/claims",
    fees: "Free",
    volume: "Storm-event driven",
    setup: "Application + COI + 2 years claims experience",
  },
];

const HARDWARE_PROGRAMS: Program[] = [
  {
    name: "Home Depot Pro Xtra Insider",
    description: "Home Depot Pro counter recommends contractors to walk-in shoppers asking 'do you know a guy?'. Get on the local store's vendor list.",
    link: "https://www.homedepot.com/c/Pro_Xtra",
    fees: "Free",
    volume: "5–20 referrals/year per store",
    setup: "Walk in to your local Home Depot Pro desk with business cards + COI",
  },
  {
    name: "Lowe's Pro Builder Program",
    description: "Same as above for Lowe's. Many MA contractors only do one — pick the closer store.",
    link: "https://www.lowes.com/l/Pro/Builders",
    fees: "Free",
    volume: "Similar to HD",
    setup: "Apply online + visit store",
  },
];

export default function PartnershipsPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Handshake className="h-5 w-5 text-brand-600" /> Partnerships
        </h1>
        <p className="text-sm text-slate-500">
          Concrete programs you can apply to today. None of these require giving up
          equity or signing exclusive deals — they're all open-application partner programs.
        </p>
      </header>

      <Section
        icon={<Users className="h-4 w-4 text-brand-600" />}
        title="Realtor & real estate partnerships"
        subtitle="Single highest-leverage lead channel for residential contractors. Every realtor has 5–10 listings/year that need pre-listing repairs."
        programs={REALTOR_PROGRAMS}
      />

      <Section
        icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
        title="Insurance adjuster networks"
        subtitle="Storm-damage and water-damage claims are guaranteed work. Approved-vendor status = direct claim assignments."
        programs={INSURANCE_PROGRAMS}
      />

      <Section
        icon={<Store className="h-4 w-4 text-amber-600" />}
        title="Hardware store programs"
        subtitle="Lower volume but trust-rich. Customers asking the Pro desk for a contractor are pre-qualified."
        programs={HARDWARE_PROGRAMS}
      />

      <section className="card p-6 bg-amber-50 border-amber-200">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-amber-700" />
          <h2 className="font-semibold">Heads up — what every program will ask for</h2>
        </div>
        <ul className="mt-3 text-sm text-amber-900 space-y-1 list-disc list-inside">
          <li><strong>COI (Certificate of Insurance)</strong> — usually $1M general liability minimum, $1M auto, workers' comp if you have employees. Your insurance agent emails it in 10 minutes.</li>
          <li><strong>W-9</strong> — standard tax form so they can 1099 you.</li>
          <li><strong>References (3 minimum)</strong> — past clients or other partners.</li>
          <li><strong>License copy</strong> — MA Construction Supervisor License (CSL), Home Improvement Contractor (HIC) registration, or trade-specific license.</li>
          <li><strong>Background check</strong> — required for insurance programs working in occupied homes.</li>
          <li><strong>Sample work / portfolio</strong> — photos + 1-page testimonial sheet.</li>
        </ul>
        <p className="mt-3 text-sm text-amber-900">
          Set all of this up once as a "partner packet" PDF and you can apply to 20 programs in an afternoon.
        </p>
      </section>
    </div>
  );
}

function Section({
  icon, title, subtitle, programs,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  programs: Program[];
}) {
  return (
    <section>
      <h2 className="font-semibold flex items-center gap-2">{icon} {title}</h2>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
      <ul className="mt-4 grid md:grid-cols-2 gap-3">
        {programs.map((p) => (
          <li key={p.name} className="card p-5 space-y-2">
            <h3 className="font-semibold">{p.name}</h3>
            <p className="text-sm text-slate-700">{p.description}</p>
            <dl className="text-xs grid grid-cols-1 gap-y-0.5">
              <div className="flex gap-1.5"><dt className="text-slate-500 shrink-0">Fees:</dt><dd>{p.fees}</dd></div>
              <div className="flex gap-1.5"><dt className="text-slate-500 shrink-0">Volume:</dt><dd>{p.volume}</dd></div>
              <div className="flex gap-1.5"><dt className="text-slate-500 shrink-0">Setup:</dt><dd>{p.setup}</dd></div>
            </dl>
            <a href={p.link} target="_blank" rel="noreferrer"
              className="text-xs text-brand-600 inline-flex items-center gap-1 mt-1">
              Apply <ExternalLink className="h-3 w-3" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
