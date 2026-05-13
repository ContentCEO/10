import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isOwnerEmail } from "@/lib/owner";
import { OverseerPanel } from "./OverseerPanel";

export const dynamic = "force-dynamic";

export default async function OwnerOverseerPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isOwnerEmail(user.email)) redirect("/dashboard");
  const { data: profile } = await supabase
    .from("profiles").select("email").eq("id", user.id).single();

  return <OverseerPanel ownerEmail={profile?.email ?? user.email ?? ""} />;
}
