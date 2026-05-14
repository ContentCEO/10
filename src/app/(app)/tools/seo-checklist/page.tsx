import Link from "next/link";
import { ExternalLink, MapPin, Search } from "lucide-react";

// Plan 1 / Section D / Idea #12 — Local SEO checklist.
//
// Static, well-curated checklist of citations + actions every local
// contractor should complete. Sortable by status (TODO in v2: persist
// completion per profile).

export const dynamic = "force-static";

interface Item {
  category: string;
  label: string;
  url: string;
  priority: "P0" | "P1" | "P2";
  why: string;
}

const ITEMS: Item[] = [
  // Tier 0 — non-negotiable.
  { category: "Tier 0 · Must-do", label: "Google Business Profile",   url: "https://business.google.com",
    priority: "P0", why: "Single biggest lever for local search rankings." },
  { category: "Tier 0 · Must-do", label: "Bing Places for Business",  url: "https://www.bingplaces.com",
    priority: "P0", why: "10-20% of search; takes 5 min to claim." },
  { category: "Tier 0 · Must-do", label: "Apple Maps Connect",        url: "https://mapsconnect.apple.com",
    priority: "P0", why: "Required to show in Siri / Apple Maps results." },
  { category: "Tier 0 · Must-do", label: "Yelp Business",             url: "https://biz.yelp.com",
    priority: "P0", why: "Strong for service businesses; review velocity matters." },
  { category: "Tier 0 · Must-do", label: "Facebook Page",             url: "https://facebook.com/business",
    priority: "P0", why: "Discovery + reviews + simple ad funnel." },

  // Tier 1 — industry directories.
  { category: "Tier 1 · Industry", label: "Angi (Angie's List)",       url: "https://www.angi.com",
    priority: "P1", why: "Active homeowner audience for trades." },
  { category: "Tier 1 · Industry", label: "Houzz Pro",                 url: "https://www.houzz.com/pro/landing",
    priority: "P1", why: "Photo-driven discovery; high-intent remodel buyers." },
  { category: "Tier 1 · Industry", label: "HomeAdvisor / IAC",         url: "https://www.homeadvisor.com",
    priority: "P1", why: "Pay-per-lead — match-only listing is free." },
  { category: "Tier 1 · Industry", label: "Thumbtack",                 url: "https://www.thumbtack.com",
    priority: "P1", why: "Search-driven local pro marketplace." },
  { category: "Tier 1 · Industry", label: "Better Business Bureau",    url: "https://www.bbb.org",
    priority: "P1", why: "Older customers still check BBB." },
  { category: "Tier 1 · Industry", label: "Nextdoor for Business",     url: "https://business.nextdoor.com",
    priority: "P1", why: "Hyperlocal recommendations among neighbors." },
  { category: "Tier 1 · Industry", label: "Porch",                     url: "https://porch.com",
    priority: "P1", why: "Tied to Lowe's; home services discovery." },

  // Tier 2 — citation aggregators (push to 100+ sites).
  { category: "Tier 2 · Citations", label: "Yext (paid)",              url: "https://www.yext.com",
    priority: "P2", why: "Push business listings to 70+ sites automatically." },
  { category: "Tier 2 · Citations", label: "BrightLocal (paid)",       url: "https://www.brightlocal.com",
    priority: "P2", why: "Cheaper alternative to Yext; one-time submission." },
  { category: "Tier 2 · Citations", label: "Whitespark (paid)",        url: "https://whitespark.ca",
    priority: "P2", why: "Strong on local link-building services." },
  { category: "Tier 2 · Citations", label: "Moz Local",                url: "https://moz.com/local",
    priority: "P2", why: "Distribution to data aggregators (Acxiom, Neustar, etc.)." },

  // Tier 3 — on-page basics.
  { category: "Tier 3 · On-page", label: "Schema.org LocalBusiness JSON-LD on your site",
    url: "https://schema.org/LocalBusiness",
    priority: "P1", why: "Tells Google your name/address/phone/services in their language." },
  { category: "Tier 3 · On-page", label: "Per-city landing pages",      url: "https://moz.com/learn/seo/on-site-seo",
    priority: "P1", why: "One page per service × city you serve. Compounds in Google." },
  { category: "Tier 3 · On-page", label: "Reviews widget embedded",     url: "https://moz.com/local-search-ranking-factors",
    priority: "P2", why: "Pull Google reviews onto your own site for SEO." },
  { category: "Tier 3 · On-page", label: "Mobile speed (PageSpeed 90+)",url: "https://pagespeed.web.dev",
    priority: "P1", why: "Slow pages drop rankings AND conversion. Aim for 90+." },
  { category: "Tier 3 · On-page", label: "HTTPS + valid sitemap.xml",   url: "https://search.google.com/search-console",
    priority: "P0", why: "Required basics. Submit sitemap in Search Console." },

  // Tier 4 — reviews + reputation.
  { category: "Tier 4 · Reviews", label: "Aim for 20+ Google reviews",  url: "https://support.google.com/business/answer/7035772",
    priority: "P0", why: "Threshold where Google starts trusting the listing." },
  { category: "Tier 4 · Reviews", label: "Respond to every review",     url: "https://support.google.com/business/answer/3474050",
    priority: "P1", why: "Improves rankings, shows you care, helps with bad ones." },
  { category: "Tier 4 · Reviews", label: "Weekly review-request flow",  url: "/preferences",
    priority: "P1", why: "Automate this — ContractorFlow's Review Requester agent does it." },
];

const CATEGORIES = Array.from(new Set(ITEMS.map((i) => i.category)));

export default function SeoChecklistPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Search className="h-3.5 w-3.5" /> Marketing · Local SEO</span>
          <h1 className="mt-2 display-h2"><span className="gradient-text">Local SEO checklist</span></h1>
          <p className="mt-2 text-sm text-ink-600 max-w-2xl">
            Every citation, listing, and on-page tweak a small contractor should claim,
            ranked by priority. Work top to bottom; even 50% completion meaningfully moves rankings.
          </p>
        </div>
      </header>

      {CATEGORIES.map((cat) => (
        <section key={cat} className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight mb-4 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-brand-600" /> {cat}
          </h2>
          <ul className="divide-y divide-ink-100">
            {ITEMS.filter((i) => i.category === cat).map((item, i) => (
              <li key={`${cat}-${i}`} className="py-3 flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{item.label}</span>
                    <span className={
                      item.priority === "P0" ? "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700" :
                      item.priority === "P1" ? "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700" :
                                               "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600"
                    }>
                      {item.priority}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500">{item.why}</p>
                </div>
                {item.url.startsWith("/") ? (
                  <Link href={item.url} className="btn-secondary text-xs px-3 py-1 shrink-0">
                    Open <ExternalLink className="h-3 w-3" />
                  </Link>
                ) : (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs px-3 py-1 shrink-0">
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="card p-5 text-sm text-ink-600">
        <strong>Note:</strong> Checkbox state isn&apos;t saved yet. Coming next: per-account
        progress tracking + reminders when you skip a P0.
      </div>
    </div>
  );
}
