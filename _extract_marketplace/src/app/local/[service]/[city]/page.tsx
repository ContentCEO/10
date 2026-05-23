import { ArrowRight, CheckCircle2, MapPin, ShieldCheck, Star } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai";
import { Stars } from "@/components/Stars";
import type { ContractorReview, DirectoryProfile } from "@/lib/directory";
import { LocalCaptureForm } from "./LocalCaptureForm";

// Render on demand the first time, then cache for 24 hours. Lets us
// programmatically support every <service, city> combo Google indexes.
export const revalidate = 86400;

function titleCase(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function unslug(slug: string) {
  return decodeURIComponent(slug).replace(/-/g, " ").trim();
}

export async function generateMetadata({
  params,
}: {
  params: { service: string; city: string };
}): Promise<Metadata> {
  const service = titleCase(unslug(params.service));
  const city = titleCase(unslug(params.city));
  return {
    title: `${service} contractors in ${city} | ContractorFlow`,
    description: `Find trusted ${service.toLowerCase()} pros in ${city}. Free quotes from licensed contractors — typically within 24 hours.`,
    alternates: { canonical: `/local/${params.service}/${params.city}` },
  };
}

async function generateLocalCopy(service: string, city: string) {
  try {
    const text = await generateText({
      system:
        "You write the body copy for a local-service SEO landing page. Output JSON " +
        "with keys: 'tagline' (10-15 words), 'intro' (2 short paragraphs), " +
        "'why_us' (array of 3 short bullet strings, no markdown), 'faq' (array " +
        "of 3 { question, answer } objects). No prose outside the JSON, no fences.",
      user: `Service: ${service}\nCity: ${city}`,
      maxTokens: 700,
    });
    const stripped = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(stripped) as {
      tagline: string;
      intro: string;
      why_us: string[];
      faq: { question: string; answer: string }[];
    };
    return parsed;
  } catch {
    return {
      tagline: `Trusted ${service.toLowerCase()} pros serving ${city} and the surrounding area.`,
      intro: `Looking for a contractor for your ${service.toLowerCase()} project in ${city}? You're in the right place. We match homeowners with vetted, licensed pros — typically within 24 hours and at no cost to you.`,
      why_us: [
        "Vetted contractors with verified credentials",
        "Multiple quotes, one form",
        "Free, no obligation",
      ],
      faq: [
        { question: `How much does a ${service.toLowerCase()} cost in ${city}?`,
          answer: `It varies by scope, but our AI estimator gives you a free ballpark in 30 seconds.` },
        { question: "Do I have to pay to use this service?",
          answer: "No — homeowners use this 100% free. We're paid by the contractors, not you." },
        { question: "How quickly will I hear back?",
          answer: "Most homeowners hear from a matched pro within 24 hours." },
      ],
    };
  }
}

export default async function LocalLandingPage({
  params,
}: {
  params: { service: string; city: string };
}) {
  const service = titleCase(unslug(params.service));
  const city = titleCase(unslug(params.city));

  const admin = createAdminClient();
  // Pull up to 6 published contractors whose service area matches.
  const cityLower = city.toLowerCase();
  const serviceLower = service.toLowerCase();

  const { data: prosRaw } = await admin
    .from("profiles")
    .select("id, business_name, headline, services, service_cities, logo_url, hero_image_url, is_published, account_type, years_in_business")
    .eq("account_type", "contractor").eq("is_published", true)
    .limit(50);

  type Pro = DirectoryProfile & { account_type: string };
  const candidates = ((prosRaw ?? []) as unknown as Pro[]).filter((p) => {
    const matchesCity = (p.service_cities ?? []).some(
      (c) => c.toLowerCase().includes(cityLower) || cityLower.includes(c.toLowerCase()),
    );
    const matchesService = (p.services ?? []).some(
      (s) => s.toLowerCase().includes(serviceLower) || serviceLower.includes(s.toLowerCase()),
    );
    return matchesCity && matchesService;
  }).slice(0, 6);

  // If we don't have matches, just show any published pros so the page still feels alive.
  const featured = candidates.length > 0
    ? candidates
    : ((prosRaw ?? []) as unknown as Pro[]).slice(0, 6);

  const proIds = featured.map((p) => p.id);
  let reviewsByPro: Record<string, ContractorReview[]> = {};
  if (proIds.length) {
    const { data } = await admin
      .from("contractor_reviews").select("*").in("contractor_id", proIds);
    for (const r of ((data ?? []) as ContractorReview[])) {
      (reviewsByPro[r.contractor_id] ||= []).push(r);
    }
  }

  const copy = await generateLocalCopy(service, city);

  return (
    <main className="min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] bg-brand-radial blur-3xl" />

      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
            CF
          </span>
          ContractorFlow
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/pros" className="btn-secondary hidden sm:inline-flex">All pros</Link>
          <Link href="#quote" className="btn-primary">
            Get a free quote <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10 grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <span className="badge bg-brand-50 text-brand-700 ring-brand-200">
            <MapPin className="h-3 w-3 mr-1" />
            Serving {city}
          </span>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            {service} in <span className="gradient-text">{city}</span>
          </h1>
          <p className="mt-3 text-lg text-slate-600">{copy.tagline}</p>
          <div className="mt-6 prose prose-slate max-w-none text-slate-700 text-sm">
            {copy.intro.split("\n\n").map((para, i) => <p key={i}>{para}</p>)}
          </div>
          <ul className="mt-6 space-y-2 text-sm">
            {copy.why_us.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div id="quote" className="card p-6 sm:p-7">
          <h2 className="text-xl font-bold">Get a free quote</h2>
          <p className="text-sm text-slate-500 mt-1">Takes about 60 seconds.</p>
          <LocalCaptureForm service={service} city={city} />
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="text-2xl font-bold">Top-rated {service.toLowerCase()} pros in {city}</h2>
          <ul className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((p) => {
              const reviews = reviewsByPro[p.id] ?? [];
              const avg = reviews.length
                ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                : null;
              return (
                <li key={p.id}>
                  <Link href={`/pros/${p.id}`} className="card card-hover p-5 block h-full">
                    {p.hero_image_url ? (
                      <img src={p.hero_image_url} alt=""
                        className="-mx-5 -mt-5 mb-4 h-28 w-[calc(100%+2.5rem)] object-cover rounded-t-xl" />
                    ) : (
                      <div className="-mx-5 -mt-5 mb-4 h-28 w-[calc(100%+2.5rem)] rounded-t-xl bg-brand-gradient opacity-90" />
                    )}
                    <div className="flex items-center gap-3">
                      {p.logo_url ? (
                        <img src={p.logo_url} alt=""
                          className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-slate-100 grid place-items-center text-sm font-semibold text-slate-500">
                          {(p.business_name ?? "?").slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{p.business_name ?? "Local pro"}</div>
                        <Stars value={avg} count={reviews.length} showNumber />
                      </div>
                    </div>
                    {p.headline && <p className="mt-3 text-sm text-slate-700">{p.headline}</p>}
                    {p.years_in_business != null && (
                      <p className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> {p.years_in_business}+ years in business
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-2xl font-bold">Frequently asked questions</h2>
        <dl className="mt-5 space-y-4">
          {copy.faq.map((q, i) => (
            <div key={i} className="card p-5">
              <dt className="font-semibold">{q.question}</dt>
              <dd className="mt-1 text-sm text-slate-700">{q.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `${service} in ${city}`,
            areaServed: { "@type": "City", name: city },
            provider: { "@type": "Organization", name: "ContractorFlow" },
            mainEntity: copy.faq.map((q) => ({
              "@type": "Question",
              name: q.question,
              acceptedAnswer: { "@type": "Answer", text: q.answer },
            })),
          }),
        }}
      />

      <footer className="border-t border-slate-200 mt-12 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} ContractorFlow ·
        <Link href="/pros" className="ml-2 text-brand-600">All pros</Link>
      </footer>
    </main>
  );
}
