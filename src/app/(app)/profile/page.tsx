import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Globe, Image as ImageIcon, ShieldCheck, Star, X } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  CREDENTIAL_LABELS,
  type ContractorCredential,
  type ContractorPhoto,
  type ContractorReview,
  type CredentialKind,
  averageRating,
} from "@/lib/directory";
import { Stars } from "@/components/Stars";

export const dynamic = "force-dynamic";

async function saveProfile(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const csv = (v: FormDataEntryValue | null) =>
    typeof v === "string"
      ? v.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const years = formData.get("years_in_business");

  await supabase.from("profiles").update({
    business_name:   String(formData.get("business_name") ?? "").trim() || null,
    headline:        String(formData.get("headline") ?? "").trim() || null,
    bio:             String(formData.get("bio") ?? "").trim() || null,
    services:        csv(formData.get("services")),
    service_zips:    csv(formData.get("service_zips")),
    service_cities:  csv(formData.get("service_cities")),
    years_in_business: years ? Number(years) : null,
    phone_public:    String(formData.get("phone_public") ?? "").trim() || null,
    website:         String(formData.get("website") ?? "").trim() || null,
    logo_url:        String(formData.get("logo_url") ?? "").trim() || null,
    hero_image_url:  String(formData.get("hero_image_url") ?? "").trim() || null,
    google_review_url: String(formData.get("google_review_url") ?? "").trim() || null,
    payment_link_url:  String(formData.get("payment_link_url") ?? "").trim() || null,
    auto_dispatch_enabled: formData.get("auto_dispatch_enabled") === "on",
    is_published:    formData.get("is_published") === "on",
  }).eq("id", user.id);

  revalidatePath("/profile");
}

async function addCredential(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const kind = String(formData.get("kind") ?? "license") as CredentialKind;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabase.from("contractor_credentials").insert({
    contractor_id: user.id,
    kind,
    name,
    number:       String(formData.get("number") ?? "").trim() || null,
    issuer:       String(formData.get("issuer") ?? "").trim() || null,
    expires_at:   String(formData.get("expires_at") ?? "") || null,
    document_url: String(formData.get("document_url") ?? "").trim() || null,
  });
  revalidatePath("/profile");
}

async function removeCredential(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("contractor_credentials").delete().eq("id", id);
  revalidatePath("/profile");
}

async function addPhoto(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const url = String(formData.get("url") ?? "").trim();
  if (!url) return;
  await supabase.from("contractor_photos").insert({
    contractor_id: user.id,
    url,
    caption: String(formData.get("caption") ?? "").trim() || null,
  });
  revalidatePath("/profile");
}

async function removePhoto(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("contractor_photos").delete().eq("id", id);
  revalidatePath("/profile");
}

async function addReview(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const body = String(formData.get("body") ?? "").trim();
  const reviewer_name = String(formData.get("reviewer_name") ?? "").trim();
  const rating = Math.max(1, Math.min(5, Number(formData.get("rating") ?? 5)));
  if (!body || !reviewer_name) return;
  await supabase.from("contractor_reviews").insert({
    contractor_id: user.id,
    reviewer_name,
    rating,
    title:        String(formData.get("title") ?? "").trim() || null,
    body,
    project_type: String(formData.get("project_type") ?? "").trim() || null,
  });
  revalidatePath("/profile");
}

async function removeReview(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("contractor_reviews").delete().eq("id", id);
  revalidatePath("/profile");
}

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: creds }, { data: photos }, { data: reviews }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("contractor_credentials").select("*")
      .eq("contractor_id", user.id).order("created_at", { ascending: false }),
    supabase.from("contractor_photos").select("*")
      .eq("contractor_id", user.id).order("sort_order", { ascending: true }),
    supabase.from("contractor_reviews").select("*")
      .eq("contractor_id", user.id).order("created_at", { ascending: false }),
  ]);

  const p = profile as Record<string, unknown> | null;
  const credList   = (creds   ?? []) as ContractorCredential[];
  const photoList  = (photos  ?? []) as ContractorPhoto[];
  const reviewList = (reviews ?? []) as ContractorReview[];
  const avg = averageRating(reviewList);

  const publicUrl =
    (process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "") + `/pros/${user.id}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Public profile</h1>
          <p className="text-sm text-slate-500">
            Build trust with homeowners. Reviews and credentials show on your directory page.
          </p>
        </div>
        {(p?.is_published as boolean | undefined) ? (
          <a href={publicUrl} target="_blank" rel="noreferrer" className="btn-secondary">
            <Globe className="h-4 w-4" /> View public page
          </a>
        ) : (
          <span className="badge bg-slate-100 text-slate-600 ring-slate-200">Unpublished</span>
        )}
      </header>

      <form action={saveProfile} className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="business_name">Business name</label>
            <input id="business_name" name="business_name" className="input"
              defaultValue={(p?.business_name as string | null) ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="years_in_business">Years in business</label>
            <input id="years_in_business" name="years_in_business" type="number" min="0" className="input"
              defaultValue={(p?.years_in_business as number | null) ?? ""} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="headline">Headline</label>
          <input id="headline" name="headline" className="input"
            placeholder="Kitchen & bath specialists serving the North Shore"
            defaultValue={(p?.headline as string | null) ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="bio">About</label>
          <textarea id="bio" name="bio" rows={4} className="input"
            placeholder="A short paragraph homeowners read first."
            defaultValue={(p?.bio as string | null) ?? ""} />
        </div>
        <div>
          <label className="label" htmlFor="services">Services (comma-separated)</label>
          <input id="services" name="services" className="input"
            placeholder="Kitchen remodels, bathroom remodels, deck builds"
            defaultValue={((p?.services as string[] | undefined) ?? []).join(", ")} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="service_cities">Cities served</label>
            <input id="service_cities" name="service_cities" className="input"
              placeholder="Acton, Sudbury, Hudson"
              defaultValue={((p?.service_cities as string[] | undefined) ?? []).join(", ")} />
          </div>
          <div>
            <label className="label" htmlFor="service_zips">ZIPs served</label>
            <input id="service_zips" name="service_zips" className="input"
              placeholder="01720, 01776, 01749"
              defaultValue={((p?.service_zips as string[] | undefined) ?? []).join(", ")} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="phone_public">Public phone</label>
            <input id="phone_public" name="phone_public" className="input"
              defaultValue={(p?.phone_public as string | null) ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="website">Website</label>
            <input id="website" name="website" type="url" className="input"
              placeholder="https://yourbusiness.com"
              defaultValue={(p?.website as string | null) ?? ""} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="logo_url">Logo URL</label>
            <input id="logo_url" name="logo_url" type="url" className="input"
              defaultValue={(p?.logo_url as string | null) ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="hero_image_url">Hero image URL</label>
            <input id="hero_image_url" name="hero_image_url" type="url" className="input"
              defaultValue={(p?.hero_image_url as string | null) ?? ""} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="google_review_url">Google review link</label>
          <input id="google_review_url" name="google_review_url" type="url" className="input"
            placeholder="https://g.page/r/your-business-id/review"
            defaultValue={(p?.google_review_url as string | null) ?? ""} />
          <p className="mt-1 text-xs text-slate-500">
            Used in AI-drafted review request messages on completed jobs.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="payment_link_url">Stripe payment link (optional)</label>
          <input id="payment_link_url" name="payment_link_url" type="url" className="input"
            placeholder="https://buy.stripe.com/your-link"
            defaultValue={(p?.payment_link_url as string | null) ?? ""} />
          <p className="mt-1 text-xs text-slate-500">
            Surfaces as a "Pay now" button on every public invoice page.
            Create a payment link in your Stripe dashboard and paste it here.
          </p>
        </div>

        <label className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <input type="checkbox" name="is_published"
            defaultChecked={(p?.is_published as boolean | undefined) ?? false} />
          <span className="text-sm">
            <strong>Publish to directory</strong> — show me to homeowners at{" "}
            <code className="text-xs">/pros</code>.
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="auto_dispatch_enabled"
            defaultChecked={(p?.auto_dispatch_enabled as boolean | undefined) ?? false} />
          <span className="text-sm">
            <strong>Auto-send drip follow-ups</strong> — when a calendar reminder is due,
            ContractorFlow sends an AI-drafted SMS (or email) on your behalf. Requires
            Twilio / Resend env vars configured by the admin.
          </span>
        </label>

        <div className="flex justify-end">
          <button className="btn-primary">Save profile</button>
        </div>
      </form>

      {/* CREDENTIALS */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-brand-600" /> Credentials
        </h2>
        {credList.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {credList.map((c) => (
              <li key={c.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">
                    {CREDENTIAL_LABELS[c.kind]}: {c.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {[c.issuer, c.number, c.expires_at ? `expires ${c.expires_at}` : null]
                      .filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <form action={removeCredential.bind(null, c.id)}>
                  <button className="btn-secondary !py-1 text-xs">
                    <X className="h-3 w-3" /> Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addCredential} className="grid sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
          <select name="kind" className="input" defaultValue="license">
            {Object.entries(CREDENTIAL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input name="name" required className="input" placeholder="Name (e.g. MA Construction Supervisor)" />
          <input name="number" className="input" placeholder="Number" />
          <input name="issuer" className="input" placeholder="Issuer (e.g. State of MA)" />
          <input name="expires_at" type="date" className="input" placeholder="Expires" />
          <input name="document_url" type="url" className="input" placeholder="Document URL (optional)" />
          <div className="sm:col-span-2 flex justify-end">
            <button className="btn-primary">Add credential</button>
          </div>
        </form>
      </section>

      {/* PHOTOS */}
      <section className="card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-brand-600" /> Portfolio photos
        </h2>
        {photoList.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photoList.map((ph) => (
              <div key={ph.id} className="relative group rounded-lg overflow-hidden border border-slate-200">
                <img src={ph.url} alt={ph.caption ?? ""} className="w-full h-32 object-cover" />
                {ph.caption && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-xs px-2 py-1 truncate">
                    {ph.caption}
                  </div>
                )}
                <form action={removePhoto.bind(null, ph.id)}>
                  <button className="absolute top-1 right-1 h-6 w-6 grid place-items-center rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition">
                    <X className="h-3 w-3" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
        <form action={addPhoto} className="grid sm:grid-cols-[2fr_1fr_auto] gap-2 pt-3 border-t border-slate-100">
          <input name="url" type="url" required className="input"
            placeholder="https://… (paste image URL — Imgur, your site, etc.)" />
          <input name="caption" className="input" placeholder="Caption" />
          <button className="btn-primary">Add photo</button>
        </form>
        <p className="text-xs text-slate-500">
          Tip: upload to Imgur or your own site and paste the direct image URL here.
        </p>
      </section>

      {/* REVIEWS */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Star className="h-4 w-4 text-brand-600" /> Reviews
          </h2>
          <Stars value={avg} count={reviewList.length} showNumber />
        </div>

        {reviewList.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {reviewList.map((r) => (
              <li key={r.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Stars value={r.rating} />
                    <span className="font-medium">{r.reviewer_name}</span>
                    {r.project_type && (
                      <span className="text-xs text-slate-500">· {r.project_type}</span>
                    )}
                  </div>
                  {r.title && <div className="mt-1 font-semibold">{r.title}</div>}
                  <p className="mt-1 text-sm text-slate-700 whitespace-pre-line">{r.body}</p>
                </div>
                <form action={removeReview.bind(null, r.id)}>
                  <button className="btn-secondary !py-1 text-xs">
                    <X className="h-3 w-3" /> Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        <form action={addReview} className="space-y-3 pt-3 border-t border-slate-100">
          <div className="grid sm:grid-cols-2 gap-3">
            <input name="reviewer_name" required className="input" placeholder="Reviewer name" />
            <select name="rating" className="input" defaultValue="5">
              {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} stars</option>)}
            </select>
          </div>
          <input name="title" className="input" placeholder="Short title (optional)" />
          <input name="project_type" className="input" placeholder="Project type (optional)" />
          <textarea name="body" required rows={3} className="input"
            placeholder="What did they say about your work?" />
          <div className="flex justify-end">
            <button className="btn-primary">Add review</button>
          </div>
        </form>
      </section>
    </div>
  );
}
