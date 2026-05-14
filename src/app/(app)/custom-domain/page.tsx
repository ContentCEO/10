import Link from "next/link";
import { Award, Globe, ShieldCheck } from "lucide-react";

export const dynamic = "force-static";

// Custom domain setup is part-product, part-DNS-config. Full per-tenant
// routing requires Vercel's Domains API on the platform owner's account
// (us, not the contractor). This page documents the exact 4-step flow.

const STEPS = [
  {
    num: 1,
    title: "Pick your subdomain or root domain",
    body: "Examples: leads.yourbusiness.com (subdomain, recommended) or yourbusiness.com (full apex). Subdomains are simpler — no need to migrate your existing website.",
  },
  {
    num: 2,
    title: "Add the domain to your contractor profile",
    body: "Go to your profile → 'Custom domain' field → paste exactly: leads.yourbusiness.com (no https, no trailing slash).",
  },
  {
    num: 3,
    title: "Email ContractorFlow support to add the domain to our Vercel project",
    body: "Send us the exact domain string. We'll add it to Vercel which gives you a DNS target (CNAME for subdomain, A record for apex).",
  },
  {
    num: 4,
    title: "Add the DNS record at your registrar",
    body: "Subdomain: CNAME 'leads' → cname.vercel-dns.com. Apex: A record @ → 76.76.21.21. DNS propagates in 1-60 minutes. Vercel auto-issues an SSL cert.",
  },
];

const WHAT_BRANDS = [
  "/pros directory (shows only YOUR profile)",
  "/find-pro homeowner intake (leads go to YOU)",
  "/local/<service>/<city> SEO pages (your hero color + logo)",
  "/cost-calculator (your brand)",
  "/embed/quote widget on third-party sites",
  "Public invoice pages /i/[id]",
  "Public capture pages /l/[id]",
];

export default function CustomDomainPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Globe className="h-5 w-5 text-brand-600" /> Custom domain (white-label)
        </h1>
        <p className="text-sm text-slate-500">
          Run all your public-facing ContractorFlow pages on your own domain. Homeowners
          see <strong>your</strong> business — not "Powered by ContractorFlow."
        </p>
      </header>

      <section className="card p-6 bg-emerald-50 border-emerald-200">
        <h2 className="font-semibold flex items-center gap-2">
          <Award className="h-4 w-4 text-emerald-700" /> Available on the Pro plan
        </h2>
        <p className="mt-2 text-sm text-emerald-900">
          Pro tier ($149/mo) includes one custom subdomain or apex domain plus all your
          public pages re-skinned with the brand colors + logo set on your profile.
        </p>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Setup — 4 steps</h2>
        <ol className="space-y-3">
          {STEPS.map((s) => (
            <li key={s.num} className="card p-5 flex gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-white font-bold shrink-0">
                {s.num}
              </span>
              <div>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-700">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold">What gets re-branded on your domain</h2>
        <ul className="mt-3 list-disc list-inside text-sm space-y-1 text-slate-700">
          {WHAT_BRANDS.map((b) => <li key={b}>{b}</li>)}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Your authenticated app (dashboard, leads, marketplace, etc.) continues to
          live on contractorflow.com — only the public-facing surfaces move to your domain.
        </p>
      </section>

      <section className="card p-6 bg-amber-50 border-amber-200 text-sm text-amber-900">
        <strong>Heads up — DNS gotchas:</strong>
        <ul className="mt-2 list-disc list-inside space-y-1">
          <li>Apex domains (yourbusiness.com) can't use CNAME — they need an A record.</li>
          <li>If your domain is on Cloudflare, set the proxy to "DNS only" (gray cloud), not "Proxied" (orange cloud), for the first hour while Vercel issues the SSL cert.</li>
          <li>Removing the DNS record takes the site down. Don't change records casually once live.</li>
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" /> Set your brand colors + logo
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          Even without a custom domain, you can set brand colors + a logo on your
          <Link href="/profile" className="text-brand-600 ml-1">profile page</Link>. They show on every public-facing
          page tied to you (capture form, invoices, pro directory profile).
        </p>
      </section>
    </div>
  );
}
