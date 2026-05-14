import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AlertTriangle, Plus, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Item {
  id: string;
  kind: "insurance" | "license" | "bond" | "workers_comp" | "vehicle_reg" | "other";
  name: string;
  number: string | null;
  issuer: string | null;
  expires_on: string;
  notes: string | null;
}

const KIND_LABEL: Record<Item["kind"], string> = {
  insurance: "Insurance",
  license: "License",
  bond: "Bond",
  workers_comp: "Workers' Comp",
  vehicle_reg: "Vehicle Reg",
  other: "Other",
};

async function add(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const name = String(formData.get("name") ?? "").trim();
  const expires_on = String(formData.get("expires_on") ?? "");
  if (!name || !expires_on) return;
  await supabase.from("compliance_items").insert({
    user_id: user.id,
    kind: (String(formData.get("kind") ?? "insurance")) as Item["kind"],
    name,
    issuer: String(formData.get("issuer") ?? "").trim() || null,
    number: String(formData.get("number") ?? "").trim() || null,
    expires_on,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/compliance");
}

async function remove(id: string) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("compliance_items").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/compliance");
}

function daysUntil(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function statusFor(days: number): { tone: string; label: string } {
  if (days < 0)  return { tone: "bg-rose-100 text-rose-700 ring-rose-200",       label: `${-days}d ago · LAPSED` };
  if (days < 7)  return { tone: "bg-rose-100 text-rose-700 ring-rose-200",       label: `${days}d left · urgent` };
  if (days < 30) return { tone: "bg-amber-100 text-amber-700 ring-amber-200",    label: `${days}d left · renew` };
  if (days < 90) return { tone: "bg-brand-100 text-brand-700 ring-brand-200",    label: `${days}d left` };
  return { tone: "bg-emerald-100 text-emerald-700 ring-emerald-200", label: `${days}d left` };
}

export default async function CompliancePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: items } = await supabase
    .from("compliance_items")
    .select("id,kind,name,number,issuer,expires_on,notes")
    .eq("user_id", user.id)
    .order("expires_on", { ascending: true });

  const rows = (items ?? []) as Item[];
  const lapsed   = rows.filter((r) => daysUntil(r.expires_on) < 0);
  const expiring = rows.filter((r) => { const d = daysUntil(r.expires_on); return d >= 0 && d < 30; });

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><ShieldCheck className="h-3.5 w-3.5" /> Operations · Compliance</span>
          <h1 className="mt-2 display-h2">
            Don&apos;t let anything <em>lapse</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Insurance, licenses, bonds, workers&apos; comp, vehicle registrations.
            We&apos;ll text you 30 days out, 7 days out, and the day they lapse.
          </p>
          {(lapsed.length > 0 || expiring.length > 0) && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {lapsed.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 ring-1 ring-rose-200 rounded-full px-3 py-1 font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  {lapsed.length} lapsed
                </span>
              )}
              {expiring.length > 0 && (
                <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 ring-1 ring-amber-200 rounded-full px-3 py-1 font-medium">
                  <AlertTriangle className="h-3 w-3" />
                  {expiring.length} expiring within 30 days
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" /> Add compliance item
        </h2>
        <form action={add} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Kind</label>
            <select name="kind" className="input" defaultValue="insurance">
              {(Object.keys(KIND_LABEL) as Item["kind"][]).map((k) =>
                <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="General Liability" maxLength={120} />
          </div>
          <div>
            <label className="label">Issuer</label>
            <input name="issuer" className="input" placeholder="State Farm" maxLength={120} />
          </div>
          <div>
            <label className="label">Number</label>
            <input name="number" className="input" placeholder="GL-12345" maxLength={80} />
          </div>
          <div>
            <label className="label">Expires</label>
            <input name="expires_on" type="date" required className="input" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary">
              <Plus className="h-4 w-4" /> Save item
            </button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">All items</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            Nothing tracked yet. Add your insurance, license, etc. above.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {rows.map((r) => {
              const d = daysUntil(r.expires_on);
              const s = statusFor(d);
              return (
                <li key={r.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="badge bg-ink-100 text-ink-700 ring-ink-200 shrink-0">
                    {KIND_LABEL[r.kind]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-ink-500 truncate">
                      {r.issuer && <span>{r.issuer}</span>}
                      {r.number && <span className="ml-2 font-mono">{r.number}</span>}
                      <span className="ml-2">exp {r.expires_on}</span>
                    </div>
                  </div>
                  <span className={`badge ${s.tone}`}>{s.label}</span>
                  <form action={remove.bind(null, r.id)}>
                    <button type="submit" className="text-xs text-ink-400 hover:text-rose-600 transition" aria-label="Remove">×</button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
