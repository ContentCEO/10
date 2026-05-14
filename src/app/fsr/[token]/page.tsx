/* eslint-disable @next/next/no-img-element */
import { notFound } from "next/navigation";
import { CheckCircle2, Hammer, ImageIcon, MapPin } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Public field service report. The contractor copies this URL and
// sends to the homeowner / property manager / general contractor as
// proof of completion. Read-only — shows photos, work summary,
// final price.
//
// /fsr/[token]

interface Job {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  price: number | null;
  customer_id: string | null;
  updated_at: string;
  lat: number | null;
  lng: number | null;
}

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  phase: "before" | "during" | "after" | null;
}

interface Customer { name: string; }
interface BizProfile {
  business_name: string | null;
  phone_public: string | null;
  website: string | null;
}

export default async function FSRPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();

  const { data: jobRow } = await admin
    .from("jobs")
    .select("id,user_id,title,description,status,start_date,end_date,price,customer_id,updated_at,lat,lng")
    .eq("share_token", params.token).maybeSingle();
  const job = jobRow as Job | null;
  if (!job) notFound();

  const [{ data: photos }, { data: cust }, { data: prof }] = await Promise.all([
    admin.from("job_photos").select("id,url,caption,phase")
      .eq("job_id", job.id).order("taken_at"),
    job.customer_id
      ? admin.from("customers").select("name").eq("id", job.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("profiles")
      .select("business_name,phone_public,website")
      .eq("id", job.user_id).maybeSingle(),
  ]);

  const photoList = (photos ?? []) as Photo[];
  const customer = cust as Customer | null;
  const biz = prof as BizProfile | null;

  const before = photoList.filter((p) => p.phase === "before");
  const during = photoList.filter((p) => p.phase === "during");
  const after  = photoList.filter((p) => p.phase === "after");
  const other  = photoList.filter((p) => !p.phase);

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="bg-white border-b border-ink-200/70">
        <div className="max-w-3xl mx-auto px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white font-bold shadow-soft">
              CF
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-ink-500">{biz?.business_name ?? "ContractorFlow"} · Field Service Report</div>
              <h1 className="text-xl font-serif text-ink-900 truncate">{job.title}</h1>
            </div>
            {job.status === "completed" && (
              <span className="badge bg-emerald-100 text-emerald-700 ring-emerald-200 inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Completed
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 space-y-5">
        <section className="card p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Detail label="Customer" value={customer?.name ?? "—"} />
            <Detail label="Started" value={job.start_date ? new Date(job.start_date).toLocaleDateString() : "—"} />
            <Detail label="Finished" value={job.end_date ? new Date(job.end_date).toLocaleDateString() : (job.status === "completed" ? new Date(job.updated_at).toLocaleDateString() : "—")} />
            <Detail label="Total" value={job.price != null ? `$${job.price.toLocaleString()}` : "—"} />
          </div>
          {job.description && (
            <div className="mt-4 pt-4 border-t border-ink-200/70">
              <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-1">Work performed</div>
              <p className="text-sm text-ink-700 whitespace-pre-wrap">
                {job.description.replace(/\[(reminder24h|cost-\d+|nps-sent)\][^\n]*/g, "").trim()}
              </p>
            </div>
          )}
        </section>

        {photoList.length > 0 ? (
          <>
            {after.length > 0 && <PhotoBlock title="After" phase="after" photos={after} />}
            {during.length > 0 && <PhotoBlock title="During" phase="during" photos={during} />}
            {before.length > 0 && <PhotoBlock title="Before" phase="before" photos={before} />}
            {other.length > 0 && <PhotoBlock title="Other" phase="other" photos={other} />}
          </>
        ) : (
          <section className="card p-8 text-center">
            <ImageIcon className="h-8 w-8 mx-auto text-ink-300 mb-2" />
            <div className="text-sm text-ink-500">No photos attached yet.</div>
          </section>
        )}

        {job.lat != null && job.lng != null && (
          <section className="card p-4 flex items-center gap-3">
            <MapPin className="h-4 w-4 text-brand-600 shrink-0" />
            <div className="flex-1 text-sm">
              <div className="text-ink-700 font-medium">Service location</div>
              <div className="text-xs text-ink-500 font-mono tabular-nums">
                {job.lat.toFixed(4)}, {job.lng.toFixed(4)}
              </div>
            </div>
            <a href={`https://www.google.com/maps?q=${job.lat},${job.lng}`} target="_blank" rel="noreferrer"
              className="text-xs text-brand-600 font-semibold hover:underline">View map →</a>
          </section>
        )}

        {(biz?.phone_public || biz?.website) && (
          <footer className="text-center text-xs text-ink-500 py-4">
            Provided by {biz?.business_name ?? "your contractor"}
            <div className="mt-1 inline-flex items-center gap-3">
              {biz?.phone_public && <a href={`tel:${biz.phone_public}`} className="text-brand-600 font-medium">{biz.phone_public}</a>}
              {biz?.website && <a href={biz.website} className="text-brand-600 font-medium">website</a>}
            </div>
          </footer>
        )}
      </main>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</div>
      <div className="text-sm text-ink-900 font-medium truncate">{value}</div>
    </div>
  );
}

function PhotoBlock({ title, phase, photos }: { title: string; phase: string; photos: Photo[] }) {
  const tone =
    phase === "after"  ? "bg-emerald-100 text-emerald-700 ring-emerald-200" :
    phase === "during" ? "bg-amber-100 text-amber-700 ring-amber-200" :
    phase === "before" ? "bg-rose-100 text-rose-700 ring-rose-200" :
                         "bg-ink-100 text-ink-600 ring-ink-200";
  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Hammer className="h-4 w-4 text-brand-600" />
        <h2 className="font-semibold">{title}</h2>
        <span className={`badge ${tone}`}>{photos.length}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="aspect-square rounded-xl overflow-hidden bg-ink-100 ring-1 ring-ink-200/70">
            <img src={p.url} alt={p.caption ?? ""} className="w-full h-full object-cover" />
            {p.caption && (
              <div className="px-2 py-1 text-[10px] text-ink-600 truncate">{p.caption}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
