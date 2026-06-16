import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Sliders } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRADES } from "@/lib/trades";
import { PreferencesForm } from "./PreferencesForm";

export const dynamic = "force-dynamic";

interface Prefs {
  trades: string[];
  zips: string[];
  min_budget_cents: number;
  max_distance_mi: number;
  sms_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  daily_digest: boolean;
  weekly_digest: boolean;
  paused_until: string | null;
}

const DEFAULTS: Prefs = {
  trades: [], zips: [],
  min_budget_cents: 0, max_distance_mi: 50,
  sms_enabled: true, email_enabled: true, push_enabled: true,
  daily_digest: false, weekly_digest: false,
  paused_until: null,
};

export default async function MarketplacePreferencesPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data } = await admin
    .from("marketplace_preferences")
    .select("trades,zips,min_budget_cents,max_distance_mi,sms_enabled,email_enabled,push_enabled,daily_digest,weekly_digest,paused_until")
    .eq("user_id", user.id)
    .maybeSingle();

  const prefs: Prefs = (data as Prefs | null) ?? DEFAULTS;

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>

      <header>
        <span className="section-eyebrow"><Sliders className="h-3.5 w-3.5" /> Marketplace</span>
        <h1 className="mt-2 display-h2">Lead <em>preferences</em></h1>
        <p className="mt-2 text-sm text-white/60">
          Filter what kind of leads show up in your dashboard + how you&apos;re notified. Changes take effect immediately.
        </p>
      </header>

      <PreferencesForm initial={prefs} trades={TRADES.map((t) => ({ slug: t.slug, label: t.label }))} />
    </div>
  );
}
