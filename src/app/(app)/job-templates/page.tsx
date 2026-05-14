import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Plus, FileCode } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Template {
  id: string;
  name: string;
  description: string | null;
  default_price: number | null;
  default_duration_days: number | null;
  trade: string | null;
  use_count: number;
  created_at: string;
}

async function add(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const priceRaw = Number(formData.get("default_price") ?? 0);
  const durRaw = Number(formData.get("default_duration_days") ?? 0);
  await supabase.from("job_templates").insert({
    user_id: user.id,
    name,
    description: String(formData.get("description") ?? "").trim() || null,
    default_price: priceRaw > 0 ? priceRaw : null,
    default_duration_days: durRaw > 0 ? Math.round(durRaw) : null,
    trade: String(formData.get("trade") ?? "").trim() || null,
  });
  revalidatePath("/job-templates");
}

async function spawn(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { data: t } = await supabase.from("job_templates")
    .select("*").eq("id", id).eq("user_id", user.id).single();
  if (!t) return;
  const tpl = t as Template;

  const startDate = new Date();
  let endDate: string | null = null;
  if (tpl.default_duration_days) {
    const end = new Date(startDate);
    end.setDate(end.getDate() + tpl.default_duration_days);
    endDate = end.toISOString();
  }
  await supabase.from("jobs").insert({
    user_id: user.id,
    title: tpl.name,
    description: tpl.description,
    status: "scheduled",
    start_date: startDate.toISOString(),
    end_date: endDate,
    price: tpl.default_price,
  });
  await supabase.from("job_templates").update({
    use_count: tpl.use_count + 1,
  }).eq("id", tpl.id);
  revalidatePath("/job-templates");
  revalidatePath("/jobs");
}

async function remove(id: string) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("job_templates").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/job-templates");
}

export default async function JobTemplatesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rows } = await supabase
    .from("job_templates").select("*").eq("user_id", user.id)
    .order("use_count", { ascending: false }).order("name");

  const templates = (rows ?? []) as Template[];

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><FileCode className="h-3.5 w-3.5" /> Operations · Templates</span>
          <h1 className="mt-2 display-h2">
            Spawn a job in <em>one click</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Save your most common job types — gutter clean, deck repair,
            HVAC tune-up — with default scope, price, and duration. Spin
            up a new job from a template instantly.
          </p>
        </div>
      </header>

      <section className="card p-5">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-600" /> New template
        </h2>
        <form action={add} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="label">Name</label>
            <input name="name" required className="input" placeholder="Standard gutter cleaning" maxLength={200} />
          </div>
          <div>
            <label className="label">Default price ($)</label>
            <input name="default_price" type="number" step="0.01" inputMode="decimal"
              className="input text-right tabular-nums" placeholder="350" />
          </div>
          <div>
            <label className="label">Default duration (days)</label>
            <input name="default_duration_days" type="number" inputMode="numeric"
              className="input text-right tabular-nums" placeholder="1" />
          </div>
          <div>
            <label className="label">Trade</label>
            <input name="trade" className="input" placeholder="gutter / hvac / roofing" maxLength={60} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Default scope of work</label>
            <textarea name="description" className="input min-h-[80px] text-sm"
              placeholder="Clean all gutters, flush downspouts, inspect fasteners, take after photos."
              maxLength={2000} />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary">
              <Plus className="h-4 w-4" /> Save template
            </button>
          </div>
        </form>
      </section>

      <section className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-200/70">
          <h2 className="font-semibold">Templates</h2>
        </div>
        {templates.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-ink-500 italic">No templates yet.</div>
        ) : (
          <ul className="divide-y divide-ink-100">
            {templates.map((t) => (
              <li key={t.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{t.name}</span>
                    {t.trade && <span className="text-[10px] text-ink-500 font-mono">{t.trade}</span>}
                    {t.use_count > 0 && (
                      <span className="badge bg-ink-100 text-ink-600 ring-ink-200">
                        used {t.use_count}×
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-ink-600 mt-0.5 line-clamp-2">{t.description}</p>
                  )}
                  <div className="text-xs text-ink-500 mt-1 tabular-nums font-mono">
                    {t.default_price && `$${t.default_price.toLocaleString()}`}
                    {t.default_price && t.default_duration_days ? " · " : ""}
                    {t.default_duration_days && `${t.default_duration_days}d`}
                  </div>
                </div>
                <form action={spawn}>
                  <input type="hidden" name="id" value={t.id} />
                  <button type="submit" className="btn-primary text-xs py-1 px-3">Spawn job</button>
                </form>
                <form action={remove.bind(null, t.id)}>
                  <button type="submit" className="text-xs text-ink-400 hover:text-rose-600">×</button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
