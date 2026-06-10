import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ExternalLink, Globe, MapPin, Phone, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CREDENTIAL_LABELS,
  averageRating,
  type ContractorCredential,
  type ContractorPhoto,
  type ContractorReview,
  type DirectoryProfile,
} from "@/lib/directory";
import { Stars } from "@/components/Stars";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProPage({ params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { data: profileData } = await admin
    .from("profiles")
    .select("id, business_name, headline, bio, services, service_zips, service_cities, years_in_business, logo_url, hero_image_url, phone_public, website, is_published, account_type")
    .eq("id", params.id)
    .single();

  if (!profileData) notFound();
  const p = profileData as unknown as DirectoryProfile & {
    account_type: string;
  };
  if (!p.is_published || p.account_type !== "contractor") notFound();

  const [{ data: creds }, { data: photos }, { data: reviews }] = await Promise.all([
    admin.from("contractor_credentials").select("*")
      .eq("contractor_id", params.id).order("created_at", { ascending: false }),
    admin.from("contractor_photos").select("*")
      .eq("contractor_id", params.id).order("sort_order", { ascending: true }),
    admin.from("contractor_reviews").select("*")
      .eq("contractor_id", params.id).order("created_at", { ascending: false }),
  ]);

  const credList   = (creds   ?? []) as ContractorCredential[];
  const photoList  = (photos  ?? []) as ContractorPhoto[];
  const reviewList = (reviews ?? []) as ContractorReview[];
  const avg = averageRating(reviewList);

  return (
    <main className="min-h-screen">
      <header className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
            CF
          </span>
          ContractorFlow
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/pros" className="btn-secondary">All pros</Link>
          <Link href="/find-pro" className="btn-primary">
            Get matched <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {p.hero_image_url ? (
        <div
          className="h-56 sm:h-72 bg-cover bg-center"
          style={{ backgroundImage: `url(${p.hero_image_url})` }}
          aria-hidden
        />
      ) : (
        <div className="h-32 bg-brand-gradient" aria-hidden />
      )}

      <section className="mx-auto max-w-5xl px-6 -mt-12">
        <div className="card p-6 flex flex-col sm:flex-row gap-5">
          {p.logo_url ? (
            <img src={p.logo_url} alt=""
              className="h-20 w-20 rounded-xl object-cover border border-slate-200 shrink-0" />
          ) : (
            <div className="h-20 w-20 rounded-xl bg-brand-gradient text-white grid place-items-center text-xl font-bold shrink-0">
              {(p.business_name ?? "??").slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{p.business_name}</h1>
            {p.headline && <p className="text-slate-600 mt-0.5">{p.headline}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              <Stars value={avg} count={reviewList.length} showNumber size="md" />
              {p.service_cities.length > 0 && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {p.service_cities.slice(0, 3).join(", ")}
                  {p.service_cities.length > 3 && ` +${p.service_cities.length - 3}`}
                </span>
              )}
              {p.years_in_business != null && (
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {p.years_in_business}+ yrs
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <Link href="/find-pro" className="btn-primary">Request a quote</Link>
            {p.phone_public && (
              <a href={`tel:${p.phone_public}`} className="btn-secondary">
                <Phone className="h-4 w-4" /> {p.phone_public}
              </a>
            )}
            {p.website && (
              <a href={p.website} target="_blank" rel="noreferrer" className="btn-secondary">
                <Globe className="h-4 w-4" /> Website <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 mt-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {p.bio && (
            <div className="card p-6">
              <h2 className="font-semibold">About</h2>
              <p className="mt-2 text-slate-700 whitespace-pre-line">{p.bio}</p>
            </div>
          )}

          {p.services.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold">Services</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {p.services.map((s) => (
                  <span key={s} className="badge bg-brand-50 text-brand-700 ring-brand-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {photoList.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold">Recent work</h2>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photoList.map((ph) => (
                  <div key={ph.id} className="relative rounded-lg overflow-hidden border border-slate-200">
                    <img src={ph.url} alt={ph.caption ?? ""}
                      className="w-full h-36 object-cover" />
                    {ph.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-xs px-2 py-1 truncate">
                        {ph.caption}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Reviews</h2>
              <Stars value={avg} count={reviewList.length} showNumber />
            </div>
            {reviewList.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No reviews yet.</p>
            ) : (
              <ul className="mt-4 space-y-5">
                {reviewList.map((r) => (
                  <li key={r.id} className="border-b border-slate-100 last:border-0 pb-5 last:pb-0">
                    <div className="flex items-center gap-2">
                      <Stars value={r.rating} />
                      <span className="font-medium">{r.reviewer_name}</span>
                      {r.verified && (
                        <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200">
                          Verified
                        </span>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">{formatDate(r.created_at)}</span>
                    </div>
                    {r.title && <div className="mt-1 font-semibold">{r.title}</div>}
                    {r.project_type && <div className="text-xs text-slate-500">{r.project_type}</div>}
                    <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{r.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-6">
            <h2 className="font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Credentials
            </h2>
            {credList.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No credentials listed.</p>
            ) : (
              <ul className="mt-3 space-y-3 text-sm">
                {credList.map((c) => (
                  <li key={c.id}>
                    <div className="font-medium">
                      {CREDENTIAL_LABELS[c.kind]}: {c.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {[c.issuer, c.number, c.expires_at ? `expires ${c.expires_at}` : null]
                        .filter(Boolean).join(" · ") || "—"}
                    </div>
                    {c.document_url && (
                      <a href={c.document_url} target="_blank" rel="noreferrer"
                        className="text-xs text-brand-600 inline-flex items-center gap-1 mt-0.5">
                        View document <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {p.service_zips.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold">Service area ZIPs</h2>
              <div className="mt-3 flex flex-wrap gap-1">
                {p.service_zips.map((z) => (
                  <span key={z} className="badge bg-slate-100 text-slate-600 ring-slate-200">
                    {z}
                  </span>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>

      <footer className="border-t border-slate-200 mt-12 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} ContractorFlow ·
        <Link href="/pros" className="ml-2 text-brand-600">Back to directory</Link>
      </footer>
    </main>
  );
}
