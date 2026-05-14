import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Globe, Mail, Phone, Plus, Star, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Vendor {
  id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  account_number: string | null;
  notes: string | null;
  is_preferred: boolean;
}

async function add(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabase.from("vendors").insert({
    user_id: user.id,
    name,
    category: String(formData.get("category") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    website: String(formData.get("website") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    account_number: String(formData.get("account_number") ?? "").trim() || null,
    is_preferred: formData.get("is_preferred") === "on",
  });
  revalidatePath("/vendors");
}

async function togglePreferred(id: string, formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const current = formData.get("current") === "true";
  await supabase.from("vendors").update({ is_preferred: !current })
    .eq("id", id).eq("user_id", user.id);
  revalidatePath("/vendors");
}

async function remove(id: string) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("vendors").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/vendors");
}

export default async function VendorsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: vendors }, { data: spend }] = await Promise.all([
    supabase.from("vendors").select("*").eq("user_id", user.id)
      .order("is_preferred", { ascending: false }).order("name"),
    // Pull vendor → 90d spend from job_expenses for the preview column.
    supabase.from("job_expenses").select("vendor,amount_cents")
      .eq("user_id", user.id)
      .gte("spent_at", new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)),
  ]);

  const rows = (vendors ?? []) as Vendor[];
  const spendByVendor = new Map<string, number>();
  for (const e of ((spend ?? []) as { vendor: string | null; amount_cents: number }[])) {
    if (!e.vendor) continue;
    const key = e.vendor.toLowerCase().trim();
    spendByVendor.set(key, (spendByVendor.get(key) ?? 0) + e.amount_cents);
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Store className="h-3.5 w-3.5" /> Operations · Vendors</span>
          <h1 className="mt-2 display-h2">
            Your <em>supplier</em> book
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Hardware stores, parts warehouses, lumber yards. Account
            numbers, phone, who to call. Star your favorites — last 90
            days of spend shows up on the right when expense vendor names
            match.
          </p>
        </div>
      </header>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" /> Add vendor
        </h2>
        <form action={add} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="Home Depot" maxLength={200} />
          </div>
          <div>
            <label className="label">Category</label>
            <input name="category" className="input" placeholder="Hardware / lumber / electrical" maxLength={80} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="phone" type="tel" className="input" maxLength={40} />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="input" maxLength={200} />
          </div>
          <div>
            <label className="label">Website</label>
            <input name="website" type="url" className="input" maxLength={400} />
          </div>
          <div>
            <label className="label">Account #</label>
            <input name="account_number" className="input" maxLength={80} />
          </div>
          <div className="sm:col-span-3">
            <label className="label">Address</label>
            <input name="address" className="input" maxLength={400} />
          </div>
          <div className="sm:col-span-3 flex items-center justify-between gap-3">
            <label className="text-sm inline-flex items-center gap-2">
              <input type="checkbox" name="is_preferred" />
              <Star className="h-3.5 w-3.5 text-amber-500" /> Mark as preferred
            </label>
            <button type="submit" className="btn-primary">
              <Plus className="h-4 w-4" /> Save vendor
            </button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Directory</h2>
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            No vendors yet.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {rows.map((v) => {
              const spent = spendByVendor.get(v.name.toLowerCase().trim()) ?? 0;
              return (
                <li key={v.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-gradient text-white flex items-center justify-center font-semibold text-sm shrink-0">
                    {v.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{v.name}</span>
                      {v.is_preferred && <Star className="h-3 w-3 text-amber-500 fill-current shrink-0" />}
                      {v.category && <span className="text-xs text-ink-500">· {v.category}</span>}
                    </div>
                    <div className="text-xs text-ink-500 flex items-center gap-2 flex-wrap">
                      {v.phone && <Link href={`tel:${v.phone}`} className="inline-flex items-center gap-1 hover:text-brand-600"><Phone className="h-3 w-3" />{v.phone}</Link>}
                      {v.email && <Link href={`mailto:${v.email}`} className="inline-flex items-center gap-1 hover:text-brand-600"><Mail className="h-3 w-3" />{v.email}</Link>}
                      {v.website && <Link href={v.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-brand-600"><Globe className="h-3 w-3" />site</Link>}
                      {v.account_number && <span className="font-mono">acct {v.account_number}</span>}
                    </div>
                  </div>
                  {spent > 0 && (
                    <div className="text-right shrink-0">
                      <div className="text-xs text-ink-500 uppercase tracking-wider font-semibold">90d</div>
                      <div className="text-sm tabular-nums font-mono font-semibold">${(spent / 100).toFixed(0)}</div>
                    </div>
                  )}
                  <form action={togglePreferred.bind(null, v.id)}>
                    <input type="hidden" name="current" value={String(v.is_preferred)} />
                    <button type="submit" aria-label={v.is_preferred ? "Unstar" : "Star"}
                      className={v.is_preferred ? "text-amber-500" : "text-ink-300 hover:text-amber-500"}>
                      <Star className={`h-4 w-4 ${v.is_preferred ? "fill-current" : ""}`} />
                    </button>
                  </form>
                  <form action={remove.bind(null, v.id)}>
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
