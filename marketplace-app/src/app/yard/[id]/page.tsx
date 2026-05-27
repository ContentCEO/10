import { notFound } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Phone, Sparkles, Star } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface Profile {
  id: string;
  business_name: string | null;
  headline: string | null;
  services: string[] | null;
  service_cities: string[] | null;
  phone_public: string | null;
  google_review_url: string | null;
  is_published: boolean;
}

export default async function YardSignPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id,business_name,headline,services,service_cities,phone_public,google_review_url,is_published")
    .eq("id", params.id).single();
  if (!data) notFound();
  const p = data as Profile;
  if (!p.is_published) notFound();

  return (
    <main className="min-h-screen bg-mesh-1 px-4 py-10">
      <div className="mx-auto max-w-md text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-glow mx-auto">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 display-h1 text-3xl">
          Like what you see?
        </h1>
        <p className="mt-3 lede">
          You spotted a job done by <span className="font-semibold gradient-text">{p.business_name ?? "us"}</span>.
          {p.service_cities?.length ? ` Serving ${p.service_cities.slice(0, 3).join(", ")}.` : ""}
        </p>

        {p.headline && (
          <p className="mt-4 text-sm text-ink-700 italic">&ldquo;{p.headline}&rdquo;</p>
        )}

        {p.services && p.services.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-1.5">
            {p.services.slice(0, 6).map((s) => (
              <span key={s} className="badge bg-white text-ink-700 ring-ink-200 text-xs shadow-soft">{s}</span>
            ))}
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3">
          <Link href={`/l/${p.id}`} className="btn-primary text-base px-7 py-3.5 w-full justify-center">
            <Sparkles className="h-4 w-4" /> Get a free quote
          </Link>
          {p.phone_public && (
            <a href={`tel:${p.phone_public}`} className="btn-secondary text-base px-7 py-3.5 w-full justify-center">
              <Phone className="h-4 w-4" /> Call {p.phone_public}
            </a>
          )}
          {p.google_review_url && (
            <a href={p.google_review_url} target="_blank" rel="noreferrer" className="btn-ghost text-sm w-full justify-center">
              <Star className="h-4 w-4 text-amber-500" /> See Google reviews
            </a>
          )}
        </div>

        <footer className="mt-10 text-xs text-ink-500">
          Powered by ContractorFlow
        </footer>
      </div>
    </main>
  );
}
