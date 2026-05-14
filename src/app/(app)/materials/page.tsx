import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Package, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Price {
  id: string;
  sku: string | null;
  name: string;
  unit: string;
  unit_price_cents: number;
  qty: number | null;
  vendor: string | null;
  bought_at: string;
}

async function add(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const name = String(formData.get("name") ?? "").trim();
  const priceRaw = Number(formData.get("unit_price") ?? 0);
  if (!name || priceRaw <= 0) return;
  await supabase.from("material_prices").insert({
    user_id: user.id,
    name,
    sku: String(formData.get("sku") ?? "").trim() || null,
    unit: String(formData.get("unit") ?? "each").trim() || "each",
    unit_price_cents: Math.round(priceRaw * 100),
    qty: Number(formData.get("qty") ?? 1) || null,
    vendor: String(formData.get("vendor") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });
  revalidatePath("/materials");
}

interface MaterialRow {
  name: string;
  unit: string;
  latest_price: number;
  latest_at: string;
  earliest_price: number;
  earliest_at: string;
  change_pct: number;
  count: number;
  vendors: Set<string>;
}

export default async function MaterialsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("material_prices")
    .select("id,sku,name,unit,unit_price_cents,qty,vendor,bought_at")
    .eq("user_id", user.id)
    .order("bought_at", { ascending: false })
    .limit(2000);

  const prices = (rows ?? []) as Price[];

  // Aggregate by lowercase(name).
  const grouped = new Map<string, Price[]>();
  for (const p of prices) {
    const k = p.name.toLowerCase().trim();
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(p);
  }

  const materials: MaterialRow[] = Array.from(grouped.entries()).map(([, list]) => {
    const sorted = [...list].sort((a, b) => a.bought_at.localeCompare(b.bought_at));
    const earliest = sorted[0];
    const latest = sorted[sorted.length - 1];
    const earliest_price = earliest.unit_price_cents / 100;
    const latest_price = latest.unit_price_cents / 100;
    const change_pct = earliest_price > 0
      ? ((latest_price - earliest_price) / earliest_price) * 100
      : 0;
    return {
      name: latest.name,
      unit: latest.unit,
      latest_price,
      latest_at: latest.bought_at,
      earliest_price,
      earliest_at: earliest.bought_at,
      change_pct,
      count: list.length,
      vendors: new Set(list.map((p) => p.vendor).filter(Boolean) as string[]),
    };
  }).sort((a, b) => Math.abs(b.change_pct) - Math.abs(a.change_pct));

  // Volatile picks: > 15% movement
  const volatile = materials.filter((m) => Math.abs(m.change_pct) >= 15 && m.count >= 2);

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Package className="h-3.5 w-3.5" /> Operations · Material Prices</span>
          <h1 className="mt-2 display-h2">
            Watch what <em>materials</em> are doing
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Log every material purchase with a unit price. Watch the trend.
            When prices jump 15%+ you know to raise your quotes — and which
            vendors are getting expensive.
          </p>
          {volatile.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium bg-amber-100 text-amber-800 ring-1 ring-amber-200 rounded-full px-3 py-1">
              <TrendingUp className="h-3 w-3" />
              {volatile.length} item{volatile.length === 1 ? "" : "s"} moved 15%+
            </div>
          )}
        </div>
      </header>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" /> Log a purchase
        </h2>
        <form action={add} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="2×4 lumber, 8ft" maxLength={200} />
          </div>
          <div>
            <label className="label">Unit</label>
            <input name="unit" className="input" placeholder="each / lb / sq ft" maxLength={20} defaultValue="each" />
          </div>
          <div>
            <label className="label">Unit price ($)</label>
            <input name="unit_price" type="number" step="0.01" inputMode="decimal" required
              className="input text-right tabular-nums" placeholder="4.85" />
          </div>
          <div>
            <label className="label">Quantity</label>
            <input name="qty" type="number" step="0.01" inputMode="decimal"
              className="input text-right tabular-nums" placeholder="1" />
          </div>
          <div>
            <label className="label">SKU</label>
            <input name="sku" className="input font-mono" placeholder="HD-12345" maxLength={80} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Vendor</label>
            <input name="vendor" className="input" placeholder="Home Depot" maxLength={120} />
          </div>
          <div>
            <button type="submit" className="btn-primary w-full mt-7">
              <Plus className="h-4 w-4" /> Log
            </button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Price trends</h2>
        </div>
        {materials.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">No materials logged yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-ink-50/70 text-left text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Material</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Earliest</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Latest</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Δ</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px] text-right">Buys</th>
                <th className="px-4 py-3 font-semibold uppercase tracking-wider text-[11px]">Vendors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {materials.map((m) => {
                const up = m.change_pct > 0;
                const tone = Math.abs(m.change_pct) < 5 ? "text-ink-500"
                  : up ? "text-rose-700 font-semibold" : "text-emerald-700 font-semibold";
                const Trend = up ? TrendingUp : TrendingDown;
                return (
                  <tr key={m.name} className="hover:bg-brand-50/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-[10px] text-ink-500 font-mono">per {m.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">
                      ${m.earliest_price.toFixed(2)}
                      <div className="text-[10px] text-ink-400">{m.earliest_at}</div>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono">
                      ${m.latest_price.toFixed(2)}
                      <div className="text-[10px] text-ink-400">{m.latest_at}</div>
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-mono ${tone}`}>
                      {m.count >= 2 ? (
                        <span className="inline-flex items-center gap-1">
                          <Trend className="h-3 w-3" />
                          {m.change_pct >= 0 ? "+" : ""}{m.change_pct.toFixed(0)}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-mono text-ink-500">{m.count}</td>
                    <td className="px-4 py-3 text-xs text-ink-500 truncate">
                      {Array.from(m.vendors).slice(0, 2).join(", ")}
                      {m.vendors.size > 2 && ` +${m.vendors.size - 2}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
