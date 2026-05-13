import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CaptionGenerator } from "./CaptionGenerator";

export const dynamic = "force-dynamic";

export default async function SocialCaptionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("preferences,services").eq("id", user.id).single();
  const services = (profile as { services?: string[] | null } | null)?.services ?? [];
  const tone = ((profile as { preferences?: { ai_tone?: string } | null } | null)?.preferences?.ai_tone ?? "friendly") as "friendly" | "casual" | "formal" | "direct";

  return <CaptionGenerator initialServices={services} initialTone={tone} />;
}
