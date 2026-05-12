import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OverseerPanel } from "./OverseerPanel";

export const dynamic = "force-dynamic";

export default async function OwnerOverseerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("is_admin,email").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/dashboard");

  return <OverseerPanel ownerEmail={profile.email ?? user.email ?? ""} />;
}
