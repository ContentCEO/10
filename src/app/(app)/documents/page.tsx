import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Doc {
  id: string;
  kind: "w9" | "insurance" | "license" | "contract" | "tax" | "receipt" | "other";
  name: string;
  url: string;
  customer_id: string | null;
  job_id: string | null;
  uploaded_at: string;
}

const KIND_LABEL: Record<Doc["kind"], string> = {
  w9: "W-9",
  insurance: "Insurance",
  license: "License",
  contract: "Contract",
  tax: "Tax",
  receipt: "Receipt",
  other: "Other",
};

const KIND_TONE: Record<Doc["kind"], string> = {
  w9:        "bg-brand-100 text-brand-700 ring-brand-200",
  insurance: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  license:   "bg-violet-100 text-violet-700 ring-violet-200",
  contract:  "bg-amber-100 text-amber-700 ring-amber-200",
  tax:       "bg-rose-100 text-rose-700 ring-rose-200",
  receipt:   "bg-cyan-100 text-cyan-700 ring-cyan-200",
  other:     "bg-ink-100 text-ink-600 ring-ink-200",
};

async function add(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const name = String(formData.get("name") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  if (!name || !url) return;
  if (!/^https?:\/\//.test(url)) return;
  await supabase.from("documents").insert({
    user_id: user.id,
    kind: String(formData.get("kind") ?? "other") as Doc["kind"],
    name,
    url,
  });
  revalidatePath("/documents");
}

async function remove(id: string) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("documents").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/documents");
}

export default async function DocumentsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("documents").select("*").eq("user_id", user.id)
    .order("uploaded_at", { ascending: false });
  const docs = (rows ?? []) as Doc[];

  const byKind = new Map<Doc["kind"], Doc[]>();
  for (const d of docs) {
    if (!byKind.has(d.kind)) byKind.set(d.kind, []);
    byKind.get(d.kind)!.push(d);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><FileText className="h-3.5 w-3.5" /> Operations · Documents</span>
          <h1 className="mt-2 display-h2">
            Your <em>paper trail</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            W-9s, certificates of insurance, contracts, tax docs.
            Store the URL — keep the file in Google Drive, Dropbox, or
            wherever. We just remember where it is.
          </p>
        </div>
      </header>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" /> Add document
        </h2>
        <form action={add} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Kind</label>
            <select name="kind" className="input" defaultValue="other">
              {(Object.keys(KIND_LABEL) as Doc["kind"][]).map((k) =>
                <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="2025 GL Certificate of Insurance" maxLength={200} />
          </div>
          <div className="sm:col-span-3">
            <label className="label">URL</label>
            <input name="url" required type="url" className="input font-mono text-sm"
                   placeholder="https://drive.google.com/file/d/..." />
            <div className="mt-1 text-[10px] text-ink-500">
              Paste a Google Drive, Dropbox, or any share link.
            </div>
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary">
              <Plus className="h-4 w-4" /> Save document
            </button>
          </div>
        </form>
      </section>

      {docs.length === 0 ? (
        <section className="card p-10 text-center">
          <FileText className="h-10 w-10 mx-auto text-ink-300 mb-3" />
          <p className="text-sm text-ink-500">No documents yet. Add one above.</p>
        </section>
      ) : (
        (["w9", "insurance", "license", "contract", "tax", "receipt", "other"] as Doc["kind"][]).map((k) => {
          const list = byKind.get(k);
          if (!list || list.length === 0) return null;
          return (
            <section key={k} className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold">{KIND_LABEL[k]}</h2>
                <span className={`badge ${KIND_TONE[k]}`}>{list.length}</span>
              </div>
              <ul className="divide-y divide-ink-100">
                {list.map((d) => (
                  <li key={d.id} className="py-2.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <Link href={d.url} target="_blank" rel="noreferrer"
                        className="text-sm font-medium hover:text-brand-600 truncate block">
                        {d.name}
                      </Link>
                      <div className="text-xs text-ink-500">
                        uploaded {new Date(d.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                    <form action={remove.bind(null, d.id)}>
                      <button type="submit" className="text-xs text-ink-400 hover:text-rose-600 transition">×</button>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
