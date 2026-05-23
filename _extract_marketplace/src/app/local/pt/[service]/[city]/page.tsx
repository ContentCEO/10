import type { Metadata } from "next";
import { renderLocalizedPage, titleCase } from "@/lib/local-page";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: { service: string; city: string };
}): Promise<Metadata> {
  const service = titleCase(decodeURIComponent(params.service));
  const city = titleCase(decodeURIComponent(params.city));
  return {
    title: `Empreiteiros de ${service} em ${city} | ContractorFlow`,
    description: `Encontre profissionais verificados de ${service.toLowerCase()} em ${city}. Orçamentos gratuitos.`,
    alternates: {
      canonical: `/local/pt/${params.service}/${params.city}`,
      languages: {
        en: `/local/${params.service}/${params.city}`,
        es: `/local/es/${params.service}/${params.city}`,
        pt: `/local/pt/${params.service}/${params.city}`,
      },
    },
  };
}

export default function Page({ params }: { params: { service: string; city: string } }) {
  return renderLocalizedPage({
    locale: "pt",
    serviceSlug: params.service,
    citySlug: params.city,
  });
}
