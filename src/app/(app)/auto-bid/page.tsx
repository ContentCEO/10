import { revalidatePath } from "next/cache";
import { Bot, Plus, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Rule {
  id: string;
  name: string;
  is_active: boolean;
  service_keywords: string[];
  city_keywords: string[];
  zips: string[];
  min_ai_score: number;
  max_price_cents: number;
  daily_budget_cents: number;
  daily_spent_cents: number;
  total_claimed: number;
  created_at: string;
}

const csv = (s: FormDataEntryValue | null) =>
  typeof s === "string"
    ? s.split(",").map((x) => x.trim()).filter(Boolean)
    : [];

async function createRule(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("auto_bid_rules").insert({
    user_id: user.id,
    name: String(formData.get("name") ?? "My auto-bid").trim() || "My auto-bid",
    service_keywords: csv(formData.get("service_keywords")),
    city_keywords:    csv(formData.get("city_keywords")),
    zips:             csv(formData.get("zips")),
    min_ai_score:       Number(formData.get("min_ai_score") ?? 50),
    max_price_cents:    Math.round(Number(formData.get("max_price") ?? 50) * 100),
    daily_budget_cents: Math.round(Number(formData.get("daily_budget") ?? 100) * 100),
  });
  revalidatePath("/auto-bid");
}

async function toggleRule(id: string, isActive: boolean) {
  "use server";
  const supabase = createClient();
  await supabase.from("auto_bid_rules").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/auto-bid");
}

async function deleteRule(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("auto_bid_rules").delete().eq("id", id);
  revalidatePath("/auto-bid");
}

export default async function AutoBidPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rules } = await supabase
    .from("auto_bid_rules").select("*")
    .eq("user_id", user.id).order("created_at", { ascending: false });
  const list = (rules ?? []) as Rule[];

  const totalClaimed = list.reduce((s, r) => s + r.total_claimed, 0);
  const totalActive  = list.filter((r) => r.is_active).length;

  return (
    <div className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bot className="h-5 w-5 text-brand-600" /> AI auto-bid
        </h1>
        <p className="text-sm text-slate-500">
          Set criteria. When a marketplace lead matches, the AI buys it on your behalf
          from your wallet — up to your daily cap. Set-and-forget.
        </p>
      </header>

      <section className="grid sm:grid-cols-3 gap-3">
        <Tile label="Active rules" value={String(totalActive)} tone="from-indigo-500 to-violet-500" />
        <Tile label="Total auto-claimed" value={String(totalClaimed)} tone="from-emerald-500 to-teal-500" icon={TrendingUp} />
        <Tile label="Today's spend" value={`$${(list.reduce((s,r) => s + r.daily_spent_cents, 0) / 100).toFixed(0)}`} tone="from-amber-500 to-orange-500" />
      </section>

      <section className="card p-5 space-y-3 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold">Create an auto-bid rule</h2>
        </div>
        <form action={createRule} className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Rule name</label>
            <input id="name" name="name" required className="input" placeholder="Kitchen remodels in Boston" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="service_keywords">Service keywords (comma-separated)</label>
            <input id="service_keywords" name="service_keywords" className="input"
              placeholder="kitchen, bath, remodel" />
          </div>
          <div>
            <label className="label" htmlFor="city_keywords">City keywords</label>
            <input id="city_keywords" name="city_keywords" className="input"
              placeholder="boston, cambridge, somerville" />
          </div>
          <div>
            <label className="label" htmlFor="zips">ZIPs (exact match)</label>
            <input id="zips" name="zips" className="input" placeholder="02118, 02139, 02143" />
          </div>
          <div>
            <label className="label" htmlFor="min_ai_score">Min AI score</label>
            <input id="min_ai_score" name="min_ai_score" type="number" min="0" max="100"
              className="input" defaultValue="50" />
          </div>
          <div>
            <label className="label" htmlFor="max_price">Max price per lead ($)</label>
            <input id="max_price" name="max_price" type="number" min="0" step="1"
              className="input" defaultValue="50" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="daily_budget">Daily budget cap ($)</label>
            <input id="daily_budget" name="daily_budget" type="number" min="0" step="1"
              className="input" defaultValue="100" />
            <p className="mt-1 text-xs text-slate-500">
              Auto-bid stops when today's spend hits this cap, even if more qualifying leads come in.
            </p>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button className="btn-primary">Create rule</button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Your rules</h2>
        {list.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">
            No rules yet. Create one above and the daily cron starts buying matching leads.
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((r) => (
              <li key={r.id} className="card p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <strong>{r.name}</strong>
                  <span className={`badge ml-auto ${r.is_active ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                    {r.is_active ? "Active" : "Paused"}
                  </span>
                </div>
                <dl className="grid sm:grid-cols-3 gap-2 text-xs">
                  <Cell label="Service" value={r.service_keywords.join(", ") || "(any)"} />
                  <Cell label="City" value={r.city_keywords.join(", ") || "(any)"} />
                  <Cell label="ZIPs" value={r.zips.join(", ") || "(any)"} />
                  <Cell label="Min score" value={`≥${r.min_ai_score}`} />
                  <Cell label="Max price" value={`$${(r.max_price_cents/100).toFixed(0)}/lead`} />
                  <Cell label="Daily budget" value={`$${(r.daily_spent_cents/100).toFixed(0)} / $${(r.daily_budget_cents/100).toFixed(0)}`} />
                </dl>
                <div className="text-xs text-slate-500">
                  {r.total_claimed} lead{r.total_claimed === 1 ? "" : "s"} auto-claimed lifetime
                </div>
                <div className="flex gap-2 pt-2">
                  <form action={toggleRule.bind(null, r.id, !r.is_active)}>
                    <button className="btn-secondary !py-1 text-xs">
                      {r.is_active ? "Pause" : "Resume"}
                    </button>
                  </form>
                  <form action={deleteRule.bind(null, r.id)}>
                    <button className="btn-secondary !py-1 text-xs">Delete</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, tone, icon: Icon }: { label: string; value: string; tone: string; icon?: typeof TrendingUp }) {
  return (
    <div className={`stat-tile bg-gradient-to-br ${tone}`}>
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-white/85">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-white" />}
      </div>
      <div className="relative z-10 mt-2 text-3xl font-bold">{value}</div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium truncate">{value}</dd>
    </div>
  );
}
