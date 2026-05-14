import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { MissionControl } from "./MissionControl";

export const dynamic = "force-dynamic";

export default async function OwnerControlPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");
  const { data: profile } = await supabase
    .from("profiles").select("email,business_name").eq("id", user.id).single();

  return (
    <MissionControl
      ownerEmail={profile?.email ?? user.email ?? ""}
      ownerName={profile?.business_name ?? "Owner"}
    />
  );
}
