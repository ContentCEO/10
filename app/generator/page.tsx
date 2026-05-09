import { redirect } from "next/navigation";
import { getProfile, getUserOrRedirect } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { GeneratorClient } from "./GeneratorClient";
import type { Business } from "@/lib/types";

export default async function GeneratorPage() {
  await getUserOrRedirect();
  const profile = await getProfile();
  const supabase = createClient();
  const { data: businesses } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: false });

  if (!businesses || businesses.length === 0) redirect("/onboarding");

  return (
    <AppShell profile={profile}>
      <h1 className="text-2xl font-bold tracking-tight">Generate ads</h1>
      <p className="mt-1 text-zinc-600">
        Describe your product and offer. AdForge AI returns hooks, headlines, primary text,
        image prompts, video scripts, and a campaign plan.
      </p>
      <div className="mt-6">
        <GeneratorClient businesses={businesses as Business[]} />
      </div>
    </AppShell>
  );
}
