import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateText } from "@/lib/ai";
import { Stars } from "@/components/Stars";
import { isLocale, STRINGS, type Locale } from "@/lib/i18n";
import type { ContractorReview, DirectoryProfile } from "@/lib/directory";
import { LocalCaptureForm } from "../../../[service]/[city]/LocalCaptureForm";

export const revalidate = 86400;

function titleCase(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: { locale: string; service: string; city: string };
}): Promise<Metadata> {
  if (!isLocale(params.locale)) return {};
  const service = titleCase(decodeURIComponent(params.service));
  const city = titleCase(decodeURIComponent(params.city));
  const titles: Record<Locale, string> = {
    en: `${service} contractors in ${city}`,
    es: `Contratistas de ${service} en ${city}`,
    pt: `Empreiteiros de ${service} em ${city}`,
  };
  return {
    title: `${titles[params.locale as Locale]} | ContractorFlow`,
    alternates: {
      canonical: `/local/${params.locale}/${params.service}/${params.city}`,
      languages: {
        en: `/local/${params.service}/${params.city}`,
        es: `/local/es/${params.service}/${params.city}`,
        pt: `/local/pt/${params.service}/${params.city}`,
      },
    },
  };
}

async function localizedCopy(locale: Locale, service: string, city: string) {
  const langName = { en: "English", es: "Spanish", pt: "Portuguese" }[locale];
  try {
    const text = await generateText({
      system:
        `You write the body copy of a local-service SEO landing page in ${langName}. ` +
        "Output JSON with keys: 'tagline' (10-15 words), 'intro' (2 short paragraphs), " +
        "'why_us' (array of 3 short bullet strings), 'faq' (array of 3 { question, answer }). " +
        "No prose outside the JSON, no markdown fences. All copy in the target language.",
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
    const fallbacks: Record<Locale, ReturnType<typeof shape>> = {
      en: shape("English", service, city),
      es: shape("Spanish", service, city),
      pt: shape("Portuguese", service, city),
    };
    return fallbacks[locale];
  }
}

function shape(lang: string, service: string, city: string) {
  if (lang === "Spanish") {
    return {
      tagline: `Profesionales de ${service.toLowerCase()} de confianza en ${city}.`,
      intro:
        `Busca un contratista para su proyecto de ${service.toLowerCase()} en ${city}? Esta en el lugar correcto. Conectamos propietarios con profesionales verificados y con licencia, normalmente dentro de las 24 horas y sin costo para usted.`,
      why_us: ["Contratistas verificados", "Multiple cotizaciones, un formulario", "Totalmente gratis"],
      faq: [
        { question: `Cuanto cuesta ${service.toLowerCase()} en ${city}?`,
          answer: "Varia segun el alcance. Nuestra calculadora de IA le da un rango en 30 segundos." },
        { question: "Tengo que pagar por este servicio?", answer: "No, los propietarios usan este servicio 100% gratis." },
        { question: "Que tan rapido recibire una respuesta?", answer: "La mayoria recibe respuesta dentro de las 24 horas." },
      ],
    };
  }
  if (lang === "Portuguese") {
    return {
      tagline: `Profissionais de ${service.toLowerCase()} confiaveis em ${city}.`,
      intro:
        `Procurando um empreiteiro para seu projeto de ${service.toLowerCase()} em ${city}? Voce esta no lugar certo. Conectamos proprietarios com profissionais verificados e licenciados, normalmente dentro de 24 horas e sem custo para voce.`,
      why_us: ["Empreiteiros verificados", "Multiplos orcamentos, um formulario", "Totalmente gratis"],
      faq: [
        { question: `Quanto custa ${service.toLowerCase()} em ${city}?`,
          answer: "Varia conforme o escopo. Nossa calculadora de IA da uma estimativa em 30 segundos." },
        { question: "Eu pago por esse servico?", answer: "Nao, proprietarios usam este servico 100% gratuito." },
        { question: "Em quanto tempo serei contatado?", answer: "A maioria recebe contato dentro de 24 horas." },
      ],
    };
  }
  return {
    tagline: `Trusted ${service.toLowerCase()} pros serving ${city}.`,
    intro: `Looking for a contractor for your ${service.toLowerCase()} project in ${city}? You're in the right place.`,
    why_us: ["Vetted contractors", "Multiple quotes, one form", "Free, no obligation"],
    faq: [
      { question: `How much does ${service.toLowerCase()} cost in ${city}?`,
        answer: `Our AI estimator gives a free ballpark in 30 seconds.` },
      { question: "Do I have to pay?", answer: "No — homeowners use this 100% free." },
      { question: "How quickly will I hear back?", answer: "Most homeowners hear from a pro within 24 hours." },
    ],
  };
}

export default async function LocalizedLandingPage({
  params,
}: {
  params: { locale: string; service: string; city: string };
}) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const service = titleCase(decodeURIComponent(params.service));
  const city = titleCase(decodeURIComponent(params.city));
  const strings = STRINGS[locale];

  const admin = createAdminClient();
  const cityLower = city.toLowerCase();
  const serviceLower = service.toLowerCase();

  const { data: prosRaw } = await admin
    .from("profiles")
    .select("id, business_name, headline, services, service_cities, logo_url, hero_image_url, is_published, account_type, years_in_business, service_zips, bio, phone_public, website")
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

  const copy = await localizedCopy(locale, service, city);

  return (
    <main className="min-h-screen" lang={locale}>
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[500px] bg-brand-radial blur-3xl" />

      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
            CF
          </span>
          ContractorFlow
        </Link>
        <div className="flex items-center gap-2">
          <Link href="#quote" className="btn-primary">
            {strings.cta_get_quote} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10 grid lg:grid-cols-2 gap-10 items-start">
        <div>
          <span className="badge bg-brand-50 text-brand-700 ring-brand-200">
            <MapPin className="h-3 w-3 mr-1" /> {strings.serving} {city}
          </span>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            {service} <span className="gradient-text">{strings.in_label} {city}</span>
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
          <div className="mt-6 text-xs text-slate-500">
            <span>Languages: </span>
            {(["en", "es", "pt"] as Locale[]).map((l) => (
              <Link key={l}
                href={l === "en"
                  ? `/local/${params.service}/${params.city}`
                  : `/local/${l}/${params.service}/${params.city}`}
                className={`mr-2 ${l === locale ? "font-semibold text-brand-700" : "underline"}`}>
                {l.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>

        <div id="quote" className="card p-6 sm:p-7">
          <h2 className="text-xl font-bold">{strings.cta_get_quote}</h2>
          <LocalCaptureForm service={service} city={city} />
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 py-10">
          <h2 className="text-2xl font-bold">
            {strings.pros_label.replace("%s", service.toLowerCase()).replace("%s", city)}
          </h2>
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
                    <div className="font-semibold">{p.business_name ?? "Local pro"}</div>
                    <Stars value={avg} count={reviews.length} showNumber />
                    {p.headline && <p className="mt-2 text-sm text-slate-700">{p.headline}</p>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-6 py-10">
        <h2 className="text-2xl font-bold">{strings.faq_heading}</h2>
        <dl className="mt-5 space-y-4">
          {copy.faq.map((q, i) => (
            <div key={i} className="card p-5">
              <dt className="font-semibold">{q.question}</dt>
              <dd className="mt-1 text-sm text-slate-700">{q.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: `${service} in ${city}`,
            inLanguage: locale,
            areaServed: { "@type": "City", name: city },
            provider: { "@type": "Organization", name: "ContractorFlow" },
          }),
        }}
      />

      <footer className="border-t border-slate-200 mt-12 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} ContractorFlow
      </footer>
    </main>
  );
}
