import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MissionControl } from "./MissionControl";

export const dynamic = "force-dynamic";

export default async function OwnerControlPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("is_admin,email,business_name").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/dashboard");

  return (
    <MissionControl
      ownerEmail={profile.email ?? user.email ?? ""}
      ownerName={profile.business_name ?? "Owner"}
    />
  );
}
