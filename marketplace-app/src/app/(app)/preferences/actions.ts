"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
}

export async function savePreferences(p: Prefs) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  await admin.from("marketplace_preferences").upsert({
    user_id: user.id,
    trades: p.trades,
    zips: p.zips,
    min_budget_cents: p.min_budget_cents,
    max_distance_mi: p.max_distance_mi,
    sms_enabled: p.sms_enabled,
    email_enabled: p.email_enabled,
    push_enabled: p.push_enabled,
    daily_digest: p.daily_digest,
    weekly_digest: p.weekly_digest,
  }, { onConflict: "user_id" });

  revalidatePath("/marketplace/preferences");
}

export async function snoozePreferences(untilIso: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  await admin.from("marketplace_preferences").upsert({
    user_id: user.id,
    paused_until: untilIso,
  }, { onConflict: "user_id" });

  revalidatePath("/marketplace/preferences");
}

export async function clearSnooze() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const admin = createAdminClient();
  await admin.from("marketplace_preferences")
    .update({ paused_until: null })
    .eq("user_id", user.id);

  revalidatePath("/marketplace/preferences");
}
