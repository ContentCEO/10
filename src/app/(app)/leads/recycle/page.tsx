import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { Recycle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface LostLead {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  service_type: string | null;
  win_loss_reason: string | null;
  price: number | null;
  updated_at: string;
}

async function reactivate(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from("leads").update({
    status: "new",
    win_loss_reason: null,
  }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/leads/recycle");
}

export default async function LeadRecyclePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Pull lost leads from 90-365 days ago (avoid resurrecting "just-lost" ones).
  const minAge = new Date(Date.now() - 90  * 86_400_000).toISOString();
  const maxAge = new Date(Date.now() - 365 * 86_400_000).toISOString();

  const { data: rows } = await supabase
    .from("leads")
    .select("id,name,phone,email,service_type,win_loss_reason,price,updated_at")
    .eq("user_id", user.id)
    .eq("status", "lost")
    .gt("updated_at", maxAge)
    .lt("updated_at", minAge)
    .order("price", { ascending: false, nullsFirst: false })
    .limit(100);

  const leads = (rows ?? []) as LostLead[];

  // Group by loss reason for the chart, filter out auto-archived
  const realLosses = leads.filter((l) => !(l.win_loss_reason ?? "").startsWith("auto-archived"));

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Recycle className="h-3.5 w-3.5" /> Pipeline · Recycle</span>
          <h1 className="mt-2 display-h2">
            Old <em>lost leads</em> worth a 2nd shot
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Leads marked lost between 3 and 12 months ago — long enough that
            their situation may have changed. Quote variance + life-event
            timing means 5-10% reactivate. Free money.
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium bg-ink-100 text-ink-700 rounded-full px-3 py-1">
            <span className="tabular-nums font-mono">{realLosses.length}</span>
            <span>candidates · sorted by quoted value</span>
          </div>
        </div>
      </header>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Highest-value first</h2>
        </div>
        {realLosses.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">
            No 3-12mo lost leads to recycle yet.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {realLosses.map((l) => (
              <li key={l.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/leads/${l.id}`} className="text-sm font-medium hover:text-brand-600 truncate block">
                    {l.name}
                  </Link>
                  <div className="text-xs text-ink-500 truncate">
                    {l.service_type ?? "—"}
                    {(l.email || l.phone) && " · "}
                    {l.email && <span className="font-mono">{l.email}</span>}
                    {l.phone && <span className="font-mono ml-2">{l.phone}</span>}
                  </div>
                  {l.win_loss_reason && (
                    <div className="text-[11px] text-ink-500 mt-0.5 italic">
                      lost reason: {l.win_loss_reason}
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {l.price && (
                    <div className="text-sm tabular-nums font-mono font-semibold text-ink-900">
                      ${l.price.toLocaleString()}
                    </div>
                  )}
                  <div className="text-[10px] text-ink-400 tabular-nums font-mono">
                    {Math.floor((Date.now() - new Date(l.updated_at).getTime()) / 86_400_000)}d ago
                  </div>
                </div>
                <form action={reactivate}>
                  <input type="hidden" name="id" value={l.id} />
                  <button type="submit" className="btn-primary text-xs py-1 px-3 shrink-0">Re-open</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
