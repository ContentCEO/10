import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { HardHat, Mail, Phone, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Sub {
  id: string;
  name: string;
  trade: string | null;
  phone: string | null;
  email: string | null;
  rate_kind: "hourly" | "flat" | "percent";
  rate_cents: number;
  is_active: boolean;
}

interface OutstandingPayout {
  subcontractor_id: string;
  total: number;
}

async function add(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const trade = String(formData.get("trade") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;
  const rate_kind = String(formData.get("rate_kind") ?? "hourly") as Sub["rate_kind"];
  const rateRaw = Number(formData.get("rate") ?? 0);
  const rate_cents = Math.round(rateRaw * 100);

  await supabase.from("subcontractors").insert({
    user_id: user.id, name, trade, phone, email, rate_kind, rate_cents,
  });
  revalidatePath("/subcontractors");
}

function formatRate(s: Sub): string {
  if (!s.rate_cents) return "—";
  const dollars = (s.rate_cents / 100).toFixed(2);
  if (s.rate_kind === "hourly")  return `$${dollars}/hr`;
  if (s.rate_kind === "flat")    return `$${dollars} flat`;
  if (s.rate_kind === "percent") return `${dollars}%`;
  return `$${dollars}`;
}

export default async function SubcontractorsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: subs }, { data: assignments }] = await Promise.all([
    supabase.from("subcontractors").select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("subcontractor_assignments")
      .select("subcontractor_id,payout_cents,paid_at")
      .eq("user_id", user.id)
      .is("paid_at", null),
  ]);

  const rows = (subs ?? []) as Sub[];
  const owed = new Map<string, number>();
  for (const a of (assignments ?? []) as { subcontractor_id: string; payout_cents: number; paid_at: string | null }[]) {
    owed.set(a.subcontractor_id, (owed.get(a.subcontractor_id) || 0) + a.payout_cents);
  }
  const totalOwed = Array.from(owed.values()).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><HardHat className="h-3.5 w-3.5" /> Operations · Subcontractors</span>
          <h1 className="mt-2 display-h2">
            Your <em>extended crew</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Track who you sub out to. Assign them to jobs, log hours,
            mark payouts. Knowing your real labor cost per job starts here.
          </p>
          {totalOwed > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium bg-amber-100 text-amber-800 ring-1 ring-amber-200 rounded-full px-3 py-1">
              <span className="tabular-nums font-mono">${(totalOwed / 100).toFixed(0)}</span>
              <span>owed to subs</span>
            </div>
          )}
        </div>
      </header>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" /> Add subcontractor
        </h2>
        <form action={add} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="Mike — Acme Plumbing" maxLength={120} />
          </div>
          <div>
            <label className="label">Trade</label>
            <input name="trade" className="input" placeholder="Plumber" maxLength={60} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="phone" className="input" type="tel" maxLength={40} />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" className="input" type="email" maxLength={120} />
          </div>
          <div>
            <label className="label">Rate kind</label>
            <select name="rate_kind" className="input" defaultValue="hourly">
              <option value="hourly">Hourly ($/hr)</option>
              <option value="flat">Flat ($)</option>
              <option value="percent">% of job</option>
            </select>
          </div>
          <div>
            <label className="label">Rate</label>
            <input name="rate" className="input text-right tabular-nums" type="number" step="0.01" inputMode="decimal" placeholder="65.00" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" className="btn-primary">
              <Plus className="h-4 w-4" /> Save subcontractor
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
            No subs yet. Add one above.
          </div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {rows.map((s) => (
              <li key={s.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-brand-gradient text-white flex items-center justify-center font-semibold text-sm shrink-0">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                  <div className="text-xs text-ink-500 flex items-center gap-2 flex-wrap">
                    {s.trade && <span>{s.trade}</span>}
                    {s.phone && <Link href={`tel:${s.phone}`} className="inline-flex items-center gap-1 hover:text-brand-600">
                      <Phone className="h-3 w-3" /> {s.phone}
                    </Link>}
                    {s.email && <Link href={`mailto:${s.email}`} className="inline-flex items-center gap-1 hover:text-brand-600">
                      <Mail className="h-3 w-3" /> {s.email}
                    </Link>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm tabular-nums font-mono font-semibold">
                    {formatRate(s)}
                  </div>
                  {owed.has(s.id) && (
                    <div className="text-[10px] text-amber-700">
                      ${((owed.get(s.id) ?? 0) / 100).toFixed(0)} owed
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
