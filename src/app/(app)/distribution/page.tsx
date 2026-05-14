import { revalidatePath } from "next/cache";
import { Plus, Route } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Rule {
  id: string;
  name: string;
  is_active: boolean;
  service_keywords: string[];
  city_keywords: string[];
  zips: string[];
  hour_start: number;
  hour_end: number;
  priority: number;
  created_at: string;
}

const csv = (v: FormDataEntryValue | null) =>
  typeof v === "string"
    ? v.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

async function createRule(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("distribution_rules").insert({
    user_id: user.id,
    name: String(formData.get("name") ?? "My route").trim() || "My route",
    service_keywords: csv(formData.get("service_keywords")),
    city_keywords:    csv(formData.get("city_keywords")),
    zips:             csv(formData.get("zips")),
    hour_start: Math.max(0, Math.min(23, Number(formData.get("hour_start") ?? 0))),
    hour_end:   Math.max(0, Math.min(23, Number(formData.get("hour_end") ?? 23))),
    priority:   Math.max(1, Number(formData.get("priority") ?? 100)),
  });
  revalidatePath("/distribution");
}

async function toggle(id: string, isActive: boolean) {
  "use server";
  const supabase = createClient();
  await supabase.from("distribution_rules").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/distribution");
}

async function remove(id: string) {
  "use server";
  const supabase = createClient();
  await supabase.from("distribution_rules").delete().eq("id", id);
  revalidatePath("/distribution");
}

export default async function DistributionPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("distribution_rules").select("*")
    .eq("user_id", user.id).order("priority").order("created_at", { ascending: false });
  const rules = (data ?? []) as Rule[];

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Route className="h-5 w-5 text-brand-600" /> Lead distribution rules
        </h1>
        <p className="text-sm text-slate-500">
          Filter which marketplace leads you want surfaced first based on service,
          location, and time of day. Lower priority = first served. Pair with
          AI auto-bid to fully automate claiming.
        </p>
      </header>

      <section className="card p-5 space-y-3 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
        <div className="relative flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold">Create a route</h2>
        </div>
        <form action={createRule} className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Route name</label>
            <input id="name" name="name" required className="input" placeholder="Boston kitchens, business hours" />
          </div>
          <div>
            <label className="label" htmlFor="service_keywords">Service keywords</label>
            <input id="service_keywords" name="service_keywords" className="input"
              placeholder="kitchen, bath" />
          </div>
          <div>
            <label className="label" htmlFor="city_keywords">City keywords</label>
            <input id="city_keywords" name="city_keywords" className="input"
              placeholder="boston, cambridge" />
          </div>
          <div>
            <label className="label" htmlFor="zips">ZIPs</label>
            <input id="zips" name="zips" className="input" placeholder="02118, 02139" />
          </div>
          <div>
            <label className="label" htmlFor="priority">Priority (lower = first)</label>
            <input id="priority" name="priority" type="number" min="1" defaultValue="100"
              className="input" />
          </div>
          <div>
            <label className="label" htmlFor="hour_start">Active from (hour)</label>
            <input id="hour_start" name="hour_start" type="number" min="0" max="23" defaultValue="8"
              className="input" />
          </div>
          <div>
            <label className="label" htmlFor="hour_end">Until (hour)</label>
            <input id="hour_end" name="hour_end" type="number" min="0" max="23" defaultValue="20"
              className="input" />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button className="btn-primary">Create route</button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Your routes</h2>
        {rules.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">
            No routes yet. Create one above to filter your marketplace view.
          </div>
        ) : (
          <ul className="space-y-3">
            {rules.map((r) => (
              <li key={r.id} className="card p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <strong>{r.name}</strong>
                  <span className="text-xs text-slate-500">priority {r.priority}</span>
                  <span className={`badge ml-auto ${r.is_active ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}`}>
                    {r.is_active ? "Active" : "Paused"}
                  </span>
                </div>
                <div className="text-xs text-slate-600">
                  {r.service_keywords.length ? `services: ${r.service_keywords.join(", ")} · ` : ""}
                  {r.city_keywords.length ? `cities: ${r.city_keywords.join(", ")} · ` : ""}
                  {r.zips.length ? `zips: ${r.zips.join(", ")} · ` : ""}
                  active {r.hour_start}:00–{r.hour_end}:00
                </div>
                <div className="flex gap-2 pt-2">
                  <form action={toggle.bind(null, r.id, !r.is_active)}>
                    <button className="btn-secondary !py-1 text-xs">
                      {r.is_active ? "Pause" : "Resume"}
                    </button>
                  </form>
                  <form action={remove.bind(null, r.id)}>
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
