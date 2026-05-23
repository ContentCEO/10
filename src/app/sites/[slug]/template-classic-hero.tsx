"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Phone, Mail, MapPin, Star, Wrench, Home, Hammer, Sparkles, Shield,
  Leaf, ChevronRight, Clock, Zap, Award,
} from "lucide-react";
import type { SiteContent } from "@/lib/auto-outreach/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  wrench: Wrench, home: Home, hammer: Hammer, sparkles: Sparkles,
  spark: Zap, shield: Shield, leaf: Leaf, phone: Phone,
};

export function ClassicHero({ slug, content }: { slug: string; content: SiteContent }) {
  const { theme, hero, services, about, reviews, faq, contact, cta_banner } = content;
  const cssVars = {
    "--ao-primary": theme.primary,
    "--ao-accent":  theme.accent,
  } as React.CSSProperties;

  return (
    <div style={cssVars} className="font-sans">
      <PreviewBanner slug={slug} />
      <Header content={content} />
      <Hero hero={hero} contact={contact} />
      <ServicesGrid services={services} />
      <About about={about} />
      <Reviews reviews={reviews} />
      <FAQ faq={faq} />
      <CTABanner banner={cta_banner} slug={slug} />
      <Footer content={content} />
    </div>
  );
}

// ---------- Sections ----------

function PreviewBanner({ slug }: { slug: string }) {
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-900 text-sm">
      <div className="mx-auto max-w-6xl px-5 py-2 flex items-center justify-between gap-3 flex-wrap">
        <span>
          <strong>Preview</strong> — built automatically for you by ContractorFlow.
        </span>
        <Link
          href={`/sites/${slug}/claim`}
          className="rounded-md bg-amber-900 text-white px-3 py-1 text-xs font-semibold hover:bg-amber-800"
        >
          Claim this site →
        </Link>
      </div>
    </div>
  );
}

function Header({ content }: { content: SiteContent }) {
  const { hero, contact } = content;
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
        <div className="font-bold text-lg" style={{ color: "var(--ao-primary)" }}>
          {hero.headline.split(" ").slice(0, 3).join(" ")}
        </div>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
          <a href="#services" className="hover:text-slate-900">Services</a>
          <a href="#about" className="hover:text-slate-900">About</a>
          <a href="#reviews" className="hover:text-slate-900">Reviews</a>
          <a href="#contact" className="hover:text-slate-900">Contact</a>
        </nav>
        {contact.phone && (
          <a
            href={`tel:${contact.phone}`}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--ao-primary)" }}
          >
            <Phone className="h-4 w-4" /> {contact.phone}
          </a>
        )}
      </div>
    </header>
  );
}

function Hero({ hero, contact }: { hero: SiteContent["hero"]; contact: SiteContent["contact"] }) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, var(--ao-primary) 0%, color-mix(in srgb, var(--ao-primary) 70%, black) 100%)`,
      }}
    >
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28 text-white relative z-10">
        {hero.badge && (
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium mb-6">
            <Star className="h-3.5 w-3.5 fill-current" /> {hero.badge}
          </div>
        )}
        <h1 className="text-4xl md:text-6xl font-bold leading-tight max-w-3xl">
          {hero.headline}
        </h1>
        <p className="mt-5 text-lg md:text-xl text-white/90 max-w-2xl">{hero.sub}</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-100"
          >
            {hero.cta_primary} <ChevronRight className="h-4 w-4" />
          </a>
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center gap-2 rounded-lg border-2 border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10"
            >
              <Phone className="h-4 w-4" /> {hero.cta_secondary ?? "Call Now"}
            </a>
          )}
        </div>
      </div>
      <div className="absolute -right-32 -bottom-32 h-96 w-96 rounded-full bg-white/5" />
      <div className="absolute -right-12 top-12 h-56 w-56 rounded-full bg-white/5" />
    </section>
  );
}

function ServicesGrid({ services }: { services: SiteContent["services"] }) {
  if (!services?.length) return null;
  return (
    <section id="services" className="py-20 bg-slate-50">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center mb-12">
          <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--ao-accent)" }}>
            Our Services
          </div>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold">What we do best</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s, i) => {
            const Icon = ICONS[s.icon ?? ""] ?? Wrench;
            return (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition">
                <div
                  className="inline-flex h-12 w-12 items-center justify-center rounded-lg text-white mb-4"
                  style={{ backgroundColor: "var(--ao-primary)" }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{s.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function About({ about }: { about: SiteContent["about"] }) {
  return (
    <section id="about" className="py-20">
      <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--ao-accent)" }}>
            About Us
          </div>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold">{about.title}</h2>
          <div className="mt-6 prose prose-slate max-w-none whitespace-pre-line">{about.body}</div>
        </div>
        <ul className="grid sm:grid-cols-2 gap-3">
          {about.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <Award className="h-5 w-5 flex-shrink-0" style={{ color: "var(--ao-primary)" }} />
              <span className="text-sm font-medium">{h}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Reviews({ reviews }: { reviews: SiteContent["reviews"] }) {
  if (!reviews?.length) return null;
  return (
    <section id="reviews" className="py-20 bg-slate-900 text-white">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center mb-12">
          <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--ao-accent)" }}>
            Reviews
          </div>
          <h2 className="mt-2 text-3xl md:text-4xl font-bold">What our customers say</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {reviews.map((r, i) => (
            <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/10">
              <div className="flex gap-1 mb-3">
                {Array.from({ length: r.rating ?? 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-white/90">“{r.quote}”</p>
              <div className="mt-4 text-sm text-white/60 font-medium">— {r.author}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQ({ faq }: { faq: SiteContent["faq"] }) {
  if (!faq?.length) return null;
  return (
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-5">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">Frequently asked</h2>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {faq.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
        <span className="font-semibold">{q}</span>
        <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && <p className="mt-3 text-sm text-slate-600 leading-relaxed">{a}</p>}
    </div>
  );
}

function CTABanner({ banner, slug }: { banner: SiteContent["cta_banner"]; slug: string }) {
  return (
    <section id="contact" className="py-20" style={{ backgroundColor: "var(--ao-primary)" }}>
      <div className="mx-auto max-w-3xl px-5 text-center text-white">
        <h2 className="text-3xl md:text-4xl font-bold">{banner.headline}</h2>
        <p className="mt-3 text-white/90 text-lg">{banner.sub}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`/sites/${slug}/claim`}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-slate-900 hover:bg-slate-100"
          >
            {banner.cta} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer({ content }: { content: SiteContent }) {
  const { contact, hero } = content;
  return (
    <footer className="bg-slate-950 text-slate-300 py-12">
      <div className="mx-auto max-w-6xl px-5 grid sm:grid-cols-3 gap-8">
        <div>
          <div className="font-bold text-white text-lg mb-2">
            {hero.headline.split(" ").slice(0, 3).join(" ")}
          </div>
          <p className="text-sm text-slate-400">{content.seo.description}</p>
        </div>
        <div className="space-y-2 text-sm">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-white">
              <Phone className="h-4 w-4" /> {contact.phone}
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-white">
              <Mail className="h-4 w-4" /> {contact.email}
            </a>
          )}
          {contact.address && (
            <div className="flex items-start gap-2"><MapPin className="h-4 w-4 mt-0.5" /> <span>{contact.address}</span></div>
          )}
          {contact.hours && (
            <div className="flex items-start gap-2"><Clock className="h-4 w-4 mt-0.5" /> <span>{contact.hours}</span></div>
          )}
        </div>
        <div className="text-sm text-slate-500">
          <div>© {new Date().getFullYear()} {hero.headline.split(" ").slice(0, 3).join(" ")}</div>
          <div className="mt-2">Site built by <span className="font-semibold text-slate-300">ContractorFlow</span></div>
        </div>
      </div>
    </footer>
  );
}
