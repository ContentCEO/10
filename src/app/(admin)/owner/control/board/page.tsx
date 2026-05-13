import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgentBoard } from "./AgentBoard";

export const dynamic = "force-dynamic";

export default async function AgentBoardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) redirect("/dashboard");
  return <AgentBoard />;
}
