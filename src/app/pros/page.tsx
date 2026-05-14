import Link from "next/link";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DirectoryProfile, ContractorReview } from "@/lib/directory";
import { Stars } from "@/components/Stars";

export const dynamic = "force-dynamic";

export default async function ProDirectoryPage({
  searchParams,
}: {
  searchParams: { service?: string; zip?: string; q?: string };
}) {
  const admin = createAdminClient();

  // Pull all published contractors then filter client-side. Allows partial
  // ZIP match (3-digit prefix matches a service area) and free-text geo
  // matching against city names.
  const { data: profilesData } = await admin
    .from("profiles")
    .select("id, business_name, headline, bio, services, service_zips, service_cities, years_in_business, logo_url, hero_image_url, phone_public, website, is_published, account_type")
    .eq("account_type", "contractor")
    .eq("is_published", true)
    .limit(200);

  let profiles = ((profilesData ?? []) as unknown) as DirectoryProfile[];

  const svc = (searchParams.service ?? "").trim().toLowerCase();
  const zip = (searchParams.zip ?? "").trim();
  const geo = (searchParams.q ?? "").trim().toLowerCase();

  if (svc) {
    profiles = profiles.filter((p) =>
      (p.services ?? []).some((s) => s.toLowerCase().includes(svc)),
    );
  }
  if (zip) {
    const prefix = zip.slice(0, 3);
    profiles = profiles.filter((p) =>
      (p.service_zips ?? []).some((z) =>
        z === zip || z.startsWith(prefix) || zip.startsWith(z.slice(0, 3)),
      ),
    );
  }
  if (geo) {
    profiles = profiles.filter((p) =>
      (p.service_cities ?? []).some((c) => c.toLowerCase().includes(geo)) ||
      (p.business_name ?? "").toLowerCase().includes(geo) ||
      (p.headline ?? "").toLowerCase().includes(geo),
    );
  }

  // Pull aggregate review stats for the visible profiles.
  const ids = profiles.map((p) => p.id);
  let reviewsByPro: Record<string, ContractorReview[]> = {};
  if (ids.length) {
    const { data: reviewsData } = await admin
      .from("contractor_reviews").select("*").in("contractor_id", ids);
    for (const r of (reviewsData ?? []) as ContractorReview[]) {
      (reviewsByPro[r.contractor_id] ||= []).push(r);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[400px] bg-brand-radial blur-3xl" />

      <header className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
            CF
          </span>
          ContractorFlow
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/find-pro" className="btn-primary">
            Get matched <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Browse <span className="gradient-text">local contractors</span>
        </h1>
        <p className="mt-2 text-slate-600">
          Vetted pros with verified credentials and real reviews.
        </p>

        <form className="card p-4 mt-6 grid sm:grid-cols-[1fr_1fr_140px_auto] gap-2" action="/pros">
          <input name="service" defaultValue={searchParams.service ?? ""}
            className="input" placeholder="Service (e.g. kitchen remodel)" />
          <input name="q" defaultValue={searchParams.q ?? ""}
            className="input" placeholder="City or area (e.g. Boston)" />
          <input name="zip" defaultValue={searchParams.zip ?? ""}
            className="input" placeholder="ZIP" inputMode="numeric" maxLength={5} />
          <button className="btn-primary">Filter</button>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          Match by service, city, or ZIP (partial ZIP works — 3 digits matches the whole metro).
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        {profiles.length === 0 ? (
          <div className="card p-10 text-center">
            <h2 className="text-lg font-semibold">No pros found</h2>
            <p className="mt-1 text-sm text-slate-500">
              Try a broader search, or{" "}
              <Link href="/find-pro" className="text-brand-600 font-medium">
                tell us about your project
              </Link>{" "}
              and we'll match you.
            </p>
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profiles.map((p) => {
              const reviews = reviewsByPro[p.id] ?? [];
              const avg = reviews.length
                ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
                : null;
              return (
                <li key={p.id}>
                  <Link href={`/pros/${p.id}`} className="card card-hover p-5 block h-full">
                    {p.hero_image_url ? (
                      <img src={p.hero_image_url} alt=""
                        className="-mx-5 -mt-5 mb-4 h-32 w-[calc(100%+2.5rem)] object-cover rounded-t-xl" />
                    ) : (
                      <div className="-mx-5 -mt-5 mb-4 h-32 w-[calc(100%+2.5rem)] rounded-t-xl bg-brand-gradient opacity-90" />
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
                        <div className="font-semibold truncate">{p.business_name ?? "Unnamed pro"}</div>
                        <Stars value={avg} count={reviews.length} showNumber />
                      </div>
                    </div>
                    {p.headline && (
                      <p className="mt-3 text-sm text-slate-700">{p.headline}</p>
                    )}
                    <ul className="mt-3 space-y-1 text-xs text-slate-500">
                      {p.service_cities.length > 0 && (
                        <li className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" />
                          {p.service_cities.slice(0, 3).join(", ")}
                          {p.service_cities.length > 3 && ` +${p.service_cities.length - 3}`}
                        </li>
                      )}
                      {p.years_in_business != null && (
                        <li className="flex items-center gap-1.5">
                          <ShieldCheck className="h-3 w-3" />
                          {p.years_in_business}+ years in business
                        </li>
                      )}
                    </ul>
                    {p.services.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {p.services.slice(0, 3).map((s) => (
                          <span key={s} className="badge bg-slate-100 text-slate-600 ring-slate-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
