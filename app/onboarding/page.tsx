import { redirect } from "next/navigation";
import { getUserOrRedirect } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const user = await getUserOrRedirect();
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight">Set up your business</h1>
        <p className="mt-1 text-zinc-600">
          AdForge AI uses this to write ads that sound like your brand.
        </p>
        <div className="mt-8 card">
          <OnboardingForm />
        </div>
      </div>
    </div>
  );
}
