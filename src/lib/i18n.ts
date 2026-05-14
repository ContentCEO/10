export type Locale = "en" | "es" | "pt";

export const LOCALES: Locale[] = ["en", "es", "pt"];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
};

export const LOCALE_DOMAINS: Record<Locale, string> = {
  en: "the homeowner",
  es: "the homeowner (Spanish-speaking)",
  pt: "the homeowner (Portuguese-speaking, common in Brockton, Fall River, New Bedford MA)",
};

export interface LocalCopyStrings {
  badge: string;            // "Free homeowner service"
  cta_get_quote: string;    // "Get a free quote"
  cta_get_matched: string;  // "Get matched with pros"
  pros_label: string;       // "Top-rated %s pros in %s"
  faq_heading: string;      // "Frequently asked questions"
  in_label: string;         // "in"
  serving: string;          // "Serving"
}

export const STRINGS: Record<Locale, LocalCopyStrings> = {
  en: {
    badge: "Free homeowner service",
    cta_get_quote: "Get a free quote",
    cta_get_matched: "Get matched with pros",
    pros_label: "Top-rated %s pros in %s",
    faq_heading: "Frequently asked questions",
    in_label: "in",
    serving: "Serving",
  },
  es: {
    badge: "Servicio gratuito para propietarios",
    cta_get_quote: "Obtenga una cotización gratis",
    cta_get_matched: "Conéctese con profesionales",
    pros_label: "Mejores %s en %s",
    faq_heading: "Preguntas frecuentes",
    in_label: "en",
    serving: "Sirviendo",
  },
  pt: {
    badge: "Serviço gratuito para proprietários",
    cta_get_quote: "Solicite um orçamento grátis",
    cta_get_matched: "Conecte-se com profissionais",
    pros_label: "Melhores %s em %s",
    faq_heading: "Perguntas frequentes",
    in_label: "em",
    serving: "Atendendo",
  },
};

export function isLocale(s: string): s is Locale {
  return (LOCALES as string[]).includes(s);
}
