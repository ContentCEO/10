import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Copy, GitMerge } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Lead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  service_type: string | null;
  status: string;
  created_at: string;
  ai_score: number | null;
  price: number | null;
}

// Two leads are likely the same if they match on:
// - email (lowercased)
// - OR phone (digits only)
// - OR (name lowercase + service_type lowercase)
function fingerprint(l: Lead): string[] {
  const out: string[] = [];
  if (l.email) out.push(`e:${l.email.toLowerCase().trim()}`);
  if (l.phone) {
    const digits = l.phone.replace(/\D/g, "");
    if (digits.length >= 7) out.push(`p:${digits.slice(-10)}`);
  }
  if (l.name && l.service_type) {
    out.push(`ns:${l.name.toLowerCase().trim()}|${l.service_type.toLowerCase().trim()}`);
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
  // Reparent any jobs / follow-ups / proposals pointing at the dropped leads.
  await Promise.all([
    supabase.from("jobs")
      .update({ lead_id: keeperId })
      .in("lead_id", dropIds).eq("user_id", user.id),
    supabase.from("follow_ups")
      .update({ lead_id: keeperId })
      .in("lead_id", dropIds).eq("user_id", user.id),
    supabase.from("proposals")
      .update({ lead_id: keeperId })
      .in("lead_id", dropIds).eq("user_id", user.id),
  ]);
  // Delete the duplicates.
  await supabase.from("leads")
    .delete()
    .in("id", dropIds).eq("user_id", user.id);
  revalidatePath("/leads/duplicates");
  revalidatePath("/leads");
}

export default async function DuplicatesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("leads")
    .select("id,name,phone,email,service_type,status,created_at,ai_score,price")
    .order("created_at", { ascending: false })
    .limit(3000);
  const leads = (rows ?? []) as Lead[];

  // Group by every fingerprint each lead emits.
  const buckets = new Map<string, Lead[]>();
  for (const l of leads) {
    for (const fp of fingerprint(l)) {
      if (!buckets.has(fp)) buckets.set(fp, []);
      buckets.get(fp)!.push(l);
    }
  }

  // Collect unique duplicate groups (any bucket with ≥ 2 leads),
  // deduped by group signature (sorted lead ids).
  const seenGroups = new Set<string>();
  const groups: Lead[][] = [];
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const sig = [...list].map((l) => l.id).sort().join("|");
    if (seenGroups.has(sig)) continue;
    seenGroups.add(sig);
    // Prefer keepers with higher ai_score, then newer.
    const sorted = [...list].sort((a, b) => {
      const sA = a.ai_score ?? -1;
      const sB = b.ai_score ?? -1;
      if (sB !== sA) return sB - sA;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    groups.push(sorted);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Copy className="h-3.5 w-3.5" /> Pipeline · Cleanup</span>
          <h1 className="mt-2 display-h2">
            Probable <em>duplicates</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Leads that share an email, phone, or name+service. Keep the best
            one (higher AI score wins) and merge in the rest — jobs,
            follow-ups, and proposals from the dropped leads reparent
            automatically.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium bg-ink-100 text-ink-700 rounded-full px-3 py-1">
            <span className="tabular-nums font-mono">{groups.length}</span>
            <span>duplicate group{groups.length === 1 ? "" : "s"}</span>
          </div>
        </div>
      </header>

      {groups.length === 0 ? (
        <section className="card p-10 text-center">
          <p className="text-sm text-ink-500 italic">
            Nice — no obvious duplicates in your pipeline.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {groups.map((group, gi) => {
            const keeper = group[0];
            const drops = group.slice(1);
            return (
              <section key={gi} className="card p-5">
                <div className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold mb-2">
                  Group {gi + 1}
                </div>
                <ul className="divide-y divide-ink-100 mb-3">
                  {group.map((l, i) => (
                    <li key={l.id} className={`py-2 flex items-center gap-3 ${i === 0 ? "" : "opacity-70"}`}>
                      <span className={i === 0
                        ? "badge bg-emerald-100 text-emerald-700 ring-emerald-200"
                        : "badge bg-rose-100 text-rose-700 ring-rose-200"}>
                        {i === 0 ? "KEEP" : "DROP"}
                      </span>
                      <Link href={`/leads/${l.id}`} className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{l.name}</div>
                        <div className="text-xs text-ink-500 truncate">
                          {l.service_type ?? "—"}
                          {l.email && <> · {l.email}</>}
                          {l.phone && <> · {l.phone}</>}
                        </div>
                      </Link>
                      <span className="text-xs text-ink-500 tabular-nums font-mono shrink-0">
                        {l.ai_score != null ? `score ${l.ai_score}` : "—"}
                      </span>
                      <span className="text-xs text-ink-500 tabular-nums font-mono shrink-0">
                        {l.status}
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
          })}
        </div>
      )}
    </div>
  );
}
