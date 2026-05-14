import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Copy, GitMerge } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

function fingerprint(c: Customer): string[] {
  const out: string[] = [];
  if (c.email) out.push(`e:${c.email.toLowerCase().trim()}`);
  if (c.phone) {
    const digits = c.phone.replace(/\D/g, "");
    if (digits.length >= 7) out.push(`p:${digits.slice(-10)}`);
  }
  if (c.name && c.address) {
    out.push(`na:${c.name.toLowerCase().trim()}|${c.address.toLowerCase().trim()}`);
  }
  return out;
}

async function merge(keeperId: string, formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const dropIds = formData.getAll("drop_id").map(String).filter(Boolean);
  if (dropIds.length === 0) return;
  // Reparent jobs/leads/invoices/proposals to keeper.
  await Promise.all([
    supabase.from("jobs").update({ customer_id: keeperId })
      .in("customer_id", dropIds).eq("user_id", user.id),
    supabase.from("leads").update({ customer_id: keeperId })
      .in("customer_id", dropIds).eq("user_id", user.id),
    supabase.from("invoices").update({ customer_id: keeperId })
      .in("customer_id", dropIds).eq("user_id", user.id),
    supabase.from("proposals").update({ customer_id: keeperId })
      .in("customer_id", dropIds).eq("user_id", user.id),
    supabase.from("follow_ups").update({ customer_id: keeperId })
      .in("customer_id", dropIds).eq("user_id", user.id),
    supabase.from("call_log").update({ customer_id: keeperId })
      .in("customer_id", dropIds).eq("user_id", user.id),
  ]);
  await supabase.from("customers").delete()
    .in("id", dropIds).eq("user_id", user.id);
  revalidatePath("/customers/duplicates");
  revalidatePath("/customers");
}

export default async function CustomerDuplicatesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("customers").select("id,name,phone,email,address,created_at")
    .eq("user_id", user.id).limit(5000);
  const customers = (rows ?? []) as Customer[];

  const buckets = new Map<string, Customer[]>();
  for (const c of customers) {
    for (const fp of fingerprint(c)) {
      if (!buckets.has(fp)) buckets.set(fp, []);
      buckets.get(fp)!.push(c);
    }
  }

  const seenGroups = new Set<string>();
  const groups: Customer[][] = [];
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const sig = list.map((c) => c.id).sort().join("|");
    if (seenGroups.has(sig)) continue;
    seenGroups.add(sig);
    // Keeper preference: oldest (most history attached).
    const sorted = [...list].sort((a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    groups.push(sorted);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Copy className="h-3.5 w-3.5" /> Customers · Dedupe</span>
          <h1 className="mt-2 display-h2">
            Probable <em>duplicate customers</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Same email, phone, or name+address. Keeper = oldest record
            (preserves the most history). All jobs, leads, invoices,
            proposals, follow-ups, and calls reparent automatically.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium bg-ink-100 text-ink-700 rounded-full px-3 py-1">
            <span className="tabular-nums font-mono">{groups.length}</span>
            <span>duplicate group{groups.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </header>

      {groups.length === 0 ? (
        <section className="card p-10 text-center">
          <p className="text-sm text-ink-500 italic">No duplicates detected.</p>
        </section>
      ) : (
        groups.map((group, gi) => {
          const keeper = group[0];
          const drops = group.slice(1);
          return (
            <section key={gi} className="card p-5">
              <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
                Group {gi + 1}
              </div>
              <ul className="divide-y divide-ink-100 mb-3">
                {group.map((c, i) => (
                  <li key={c.id} className={`py-2 flex items-center gap-3 ${i === 0 ? "" : "opacity-70"}`}>
                    <span className={i === 0
                      ? "badge bg-emerald-100 text-emerald-700 ring-emerald-200"
                      : "badge bg-rose-100 text-rose-700 ring-rose-200"}>
                      {i === 0 ? "KEEP" : "DROP"}
                    </span>
                    <Link href={`/customers/${c.id}`} className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.name}</div>
                      <div className="text-xs text-ink-500 truncate">
                        {c.email && <>{c.email}</>}
                        {c.phone && <> · {c.phone}</>}
                        {c.address && <> · {c.address}</>}
                      </div>
                    </Link>
                    <span className="text-[10px] text-ink-400 tabular-nums font-mono shrink-0">
                      created {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
              <form action={merge.bind(null, keeper.id)} className="flex items-center justify-end gap-2">
                {drops.map((d) => <input key={d.id} type="hidden" name="drop_id" value={d.id} />)}
                <button type="submit" className="btn-primary text-xs">
                  <GitMerge className="h-3.5 w-3.5" /> Merge {drops.length} into keeper
                </button>
              </form>
            </section>
          );
        })
      )}
    </div>
  );
}
