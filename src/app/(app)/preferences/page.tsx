import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  Bell, CheckCircle2, MessageSquare, Moon, Settings2, Sliders, Sparkles, Sun,
  Volume2, Webhook,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Preferences {
  theme?: "light" | "dark" | "system";
  density?: "comfortable" | "compact";
  ai_tone?: "formal" | "friendly" | "casual" | "direct";
  sidebar_collapsed_default?: boolean;
  high_contrast?: boolean;
  marketplace_min_score?: number;
  marketplace_services?: string[];
  marketplace_regions?: string[];
}

async function savePreferences(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const get = (k: string) => formData.get(k);
  const getStr = (k: string): string | null => {
    const v = get(k);
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const getBool = (k: string): boolean => get(k) === "on";
  const getCsv = (k: string): string[] => {
    const v = get(k);
    return typeof v === "string"
      ? v.split(",").map((s) => s.trim()).filter(Boolean)
      : [];
  };

  const minScoreRaw = getStr("marketplace_min_score");
  const minScore = minScoreRaw ? Math.max(0, Math.min(100, Number(minScoreRaw))) : 0;

  const preferences: Preferences = {
    theme:    (getStr("theme") as Preferences["theme"]) ?? "system",
    density:  (getStr("density") as Preferences["density"]) ?? "comfortable",
    ai_tone:  (getStr("ai_tone") as Preferences["ai_tone"]) ?? "friendly",
    sidebar_collapsed_default: getBool("sidebar_collapsed_default"),
    high_contrast:             getBool("high_contrast"),
    marketplace_min_score:     Number.isFinite(minScore) ? minScore : 0,
    marketplace_services:      getCsv("marketplace_services"),
    marketplace_regions:       getCsv("marketplace_regions"),
  };

  await supabase.from("profiles").update({
    preferences,
    notify_email:   getBool("notify_email"),
    notify_push:    getBool("notify_push"),
    notify_sms:     getBool("notify_sms"),
    notify_webhook: getBool("notify_webhook"),
  }).eq("id", user.id);

  revalidatePath("/preferences");
}

export default async function PreferencesPage({
  searchParams,
}: {
  searchParams?: { saved?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("notify_email,notify_push,notify_sms,notify_webhook,preferences")
    .eq("id", user.id)
    .single();

  const p = (profile?.preferences ?? {}) as Preferences;
  const notif = {
    email:   profile?.notify_email   ?? true,
    push:    profile?.notify_push    ?? true,
    sms:     profile?.notify_sms     ?? false,
    webhook: profile?.notify_webhook ?? true,
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Hero */}
      <header className="card p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Settings2 className="h-3.5 w-3.5" /> Preferences</span>
          <h1 className="mt-2 display-h2"><span className="gradient-text">Make it yours</span></h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Notifications, AI follow-up tone, marketplace filters, and display options.
            Changes apply immediately to your account only.
          </p>
        </div>
      </header>

      {searchParams?.saved && (
        <div className="card p-4 border-emerald-200 bg-emerald-50/60 flex items-center gap-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          Preferences saved.
        </div>
      )}

      <form action={async (fd: FormData) => {
        "use server";
        await savePreferences(fd);
        redirect("/preferences?saved=1");
      }} className="space-y-8">

        {/* ── Notifications ─────────────────────────────────────────── */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Bell className="h-4 w-4 text-brand-600" /> Notifications
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            How we tell you about new leads, follow-up reminders, and account activity.
          </p>
          <div className="mt-5 space-y-3">
            <ToggleRow name="notify_email"   defaultChecked={notif.email}   icon={MessageSquare} title="Email"       sub="Daily digest + critical alerts." />
            <ToggleRow name="notify_push"    defaultChecked={notif.push}    icon={Volume2}       title="Push (desktop)" sub="Native notifications from the desktop app." />
            <ToggleRow name="notify_sms"     defaultChecked={notif.sms}     icon={MessageSquare} title="SMS"         sub="Texts for the urgent stuff only. Carrier fees may apply." />
            <ToggleRow name="notify_webhook" defaultChecked={notif.webhook} icon={Webhook}       title="Webhook"     sub="Send to your Zapier / custom endpoint." />
          </div>
        </section>

        {/* ── AI tone ──────────────────────────────────────────────── */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-600" /> AI follow-up tone
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            How the AI writes for you — applies to follow-up drafts, proposals, and SMS.
          </p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <RadioCard name="ai_tone" value="friendly" defaultChecked={(p.ai_tone ?? "friendly") === "friendly"} title="Friendly"  sub="Warm. First-name basis." />
            <RadioCard name="ai_tone" value="casual"   defaultChecked={p.ai_tone === "casual"}                   title="Casual"    sub="Like a text from a buddy." />
            <RadioCard name="ai_tone" value="formal"   defaultChecked={p.ai_tone === "formal"}                   title="Formal"    sub="Polished, business letter." />
            <RadioCard name="ai_tone" value="direct"   defaultChecked={p.ai_tone === "direct"}                   title="Direct"    sub="Just the facts. No fluff." />
          </div>
        </section>

        {/* ── Marketplace filters ──────────────────────────────────── */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Sliders className="h-4 w-4 text-brand-600" /> Marketplace filters
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Hide leads that don&apos;t fit your shop. Empty filter = all leads shown.
          </p>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="marketplace_min_score">
                Min AI score
              </label>
              <input id="marketplace_min_score" name="marketplace_min_score" type="number" min="0" max="100"
                className="input" defaultValue={p.marketplace_min_score ?? 0} />
              <div className="mt-1 text-xs text-ink-500">0 shows everything; 60+ filters to higher-intent leads.</div>
            </div>
            <div>
              <label className="label" htmlFor="marketplace_services">Services I do (comma-separated)</label>
              <input id="marketplace_services" name="marketplace_services" className="input"
                defaultValue={(p.marketplace_services ?? []).join(", ")}
                placeholder="kitchen, bathroom, electrical, plumbing" />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="marketplace_regions">Cities I serve (comma-separated)</label>
              <input id="marketplace_regions" name="marketplace_regions" className="input"
                defaultValue={(p.marketplace_regions ?? []).join(", ")}
                placeholder="Boston, Cambridge, Brookline, Newton" />
            </div>
          </div>
        </section>

        {/* ── Display ──────────────────────────────────────────────── */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Sun className="h-4 w-4 text-brand-600" /> Display
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            How the app looks for you.
          </p>
          <div className="mt-5 grid sm:grid-cols-2 gap-4">
            <div>
              <div className="label">Theme</div>
              <div className="grid grid-cols-3 gap-2">
                <RadioCard name="theme" value="light"  defaultChecked={p.theme === "light"} title="Light"  sub="Bright." />
                <RadioCard name="theme" value="dark"   defaultChecked={p.theme === "dark"}  title="Dark"   sub="Easy on eyes." />
                <RadioCard name="theme" value="system" defaultChecked={(p.theme ?? "system") === "system"} title="System" sub="Auto." />
              </div>
            </div>
            <div>
              <div className="label">Density</div>
              <div className="grid grid-cols-2 gap-2">
                <RadioCard name="density" value="comfortable" defaultChecked={(p.density ?? "comfortable") === "comfortable"} title="Comfortable" sub="Generous spacing." />
                <RadioCard name="density" value="compact"     defaultChecked={p.density === "compact"}                       title="Compact"     sub="More on screen." />
              </div>
            </div>
            <label className="sm:col-span-2 inline-flex items-start gap-3 mt-2 cursor-pointer p-3 rounded-xl ring-1 ring-ink-200 bg-white hover:bg-ink-50">
              <input
                type="checkbox" name="sidebar_collapsed_default"
                defaultChecked={p.sidebar_collapsed_default ?? false}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <div className="font-medium text-sm">Collapse the sidebar by default</div>
                <div className="text-xs text-ink-500">Icons-only sidebar to save horizontal space.</div>
              </div>
            </label>
            <label className="sm:col-span-2 inline-flex items-start gap-3 cursor-pointer p-3 rounded-xl ring-1 ring-ink-200 bg-white hover:bg-ink-50">
              <input
                type="checkbox" name="high_contrast"
                defaultChecked={p.high_contrast ?? false}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              <div>
                <div className="font-medium text-sm">High-contrast mode</div>
                <div className="text-xs text-ink-500">Boosts contrast, removes blur effects, thicker borders. Good for bright outdoor screens.</div>
              </div>
            </label>
          </div>
        </section>

        <div className="flex items-center justify-end gap-3">
          <button type="submit" className="btn-primary">Save preferences</button>
        </div>
      </form>
    </div>
  );
}

function ToggleRow({
  name, defaultChecked, icon: Icon, title, sub,
}: { name: string; defaultChecked: boolean; icon: typeof Bell; title: string; sub: string }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl ring-1 ring-ink-200 bg-white hover:bg-ink-50 cursor-pointer">
      <input
        type="checkbox" name={name} defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
      />
      <Icon className="h-5 w-5 text-ink-500 shrink-0 mt-0.5" />
      <div>
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-ink-500">{sub}</div>
      </div>
    </label>
  );
}

function RadioCard({
  name, value, defaultChecked, title, sub,
}: { name: string; value: string; defaultChecked: boolean; title: string; sub: string }) {
  return (
    <label className={
      defaultChecked
        ? "block p-3 rounded-xl cursor-pointer ring-2 ring-brand-500 bg-brand-50/40"
        : "block p-3 rounded-xl cursor-pointer ring-1 ring-ink-200 bg-white hover:bg-ink-50"
    }>
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} className="sr-only" />
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-ink-500 mt-0.5">{sub}</div>
    </label>
  );
}
