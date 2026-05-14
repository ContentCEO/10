import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Calculator, CheckCircle2, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEFAULT_SERVICES = [
  { key: "bath_remodel",     label: "Bathroom remodel",     unit: "sqft" },
  { key: "kitchen_remodel",  label: "Kitchen remodel",      unit: "sqft" },
  { key: "roof_replace",     label: "Roof replacement",     unit: "sqft" },
  { key: "deck_build",       label: "Deck build",           unit: "sqft" },
  { key: "fence_install",    label: "Fence install",        unit: "linear_ft" },
  { key: "interior_paint",   label: "Interior painting",    unit: "rooms" },
  { key: "panel_upgrade",    label: "Electrical panel",     unit: "panels" },
  { key: "hvac_install",     label: "HVAC install",         unit: "fixtures" },
];

async function saveRule(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const key = String(formData.get("service_key") ?? "");
  const unit = String(formData.get("unit_label") ?? "sqft");
  const base = Math.max(0, Math.round(Number(formData.get("base") ?? 0) * 100));
  const perUnit = Math.max(0, Math.round(Number(formData.get("per_unit") ?? 0) * 100));
  const multiplier = Math.max(0.1, Math.min(5, Number(formData.get("multiplier") ?? 1)));

  if (!key) return;
  await supabase.from("pricing_rules").upsert({
    user_id: user.id,
    service_key: key,
    unit_label: unit,
    base_cents: base,
    per_unit_cents: perUnit,
    multiplier,
  }, { onConflict: "user_id,service_key" });

  revalidatePath("/tools/pricing-engine");
}

export default async function PricingEnginePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("pricing_rules").select("service_key,unit_label,base_cents,per_unit_cents,multiplier")
    .eq("user_id", user.id);
  const byKey = new Map((existing ?? []).map((r: { service_key: string; unit_label: string; base_cents: number; per_unit_cents: number; multiplier: number }) => [r.service_key, r]));

  return (
    <div className="space-y-6 max-w-4xl">
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Calculator className="h-3.5 w-3.5" /> Sales · Pricing engine</span>
          <h1 className="mt-2 display-h2"><span className="gradient-text">Auto-pricing rules</span></h1>
          <p className="mt-2 text-sm text-ink-600 max-w-2xl">
            Set your base price + per-unit rate for each service. The estimate calculator,
            proposal generator, and AI auto-bid all use these numbers automatically.
            Adjust the multiplier to flex pricing seasonally.
          </p>
        </div>
      </header>

      <div className="grid sm:grid-cols-2 gap-4">
        {DEFAULT_SERVICES.map((s) => {
          const rule = byKey.get(s.key) as { unit_label: string; base_cents: number; per_unit_cents: number; multiplier: number } | undefined;
          return (
            <form key={s.key} action={saveRule} className="card p-5 space-y-3">
              <input type="hidden" name="service_key" value={s.key} />
              <input type="hidden" name="unit_label"  value={s.unit} />
              <div className="flex items-center justify-between">
                <h3 className="font-semibold tracking-tight">{s.label}</h3>
                <span className="text-[10px] uppercase font-mono tracking-wider text-ink-400 bg-ink-100 px-1.5 py-0.5 rounded">
                  {s.unit}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label text-[11px]" htmlFor={`base-${s.key}`}>Base $</label>
                  <input id={`base-${s.key}`} name="base" type="number" step="0.01" min="0"
                    className="input text-sm tabular-nums"
                    defaultValue={rule ? (rule.base_cents / 100).toFixed(2) : "0"} />
                </div>
                <div>
                  <label className="label text-[11px]" htmlFor={`per-${s.key}`}>Per {s.unit} $</label>
                  <input id={`per-${s.key}`} name="per_unit" type="number" step="0.01" min="0"
                    className="input text-sm tabular-nums"
                    defaultValue={rule ? (rule.per_unit_cents / 100).toFixed(2) : "0"} />
                </div>
                <div>
                  <label className="label text-[11px]" htmlFor={`mult-${s.key}`}>×</label>
                  <input id={`mult-${s.key}`} name="multiplier" type="number" step="0.05" min="0.1" max="5"
                    className="input text-sm tabular-nums"
                    defaultValue={rule ? rule.multiplier : "1.00"} />
                </div>
              </div>
              <button className="btn-primary w-full justify-center text-xs py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Save rule
              </button>
            </form>
          );
        })}
      </div>

      <div className="card p-5 text-sm text-ink-600 flex items-start gap-3">
        <Sparkles className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
        <div>
          <strong>Formula:</strong> <code className="text-xs">(base + per_unit × size) × multiplier</code>.
          Used by the public estimate calculator, AI proposal drafts, and the auto-bid agent.
        </div>
      </div>
    </div>
  );
}
