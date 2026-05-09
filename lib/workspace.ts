import type { SupabaseClient } from "@supabase/supabase-js";
import type { Workspace } from "./types";

export async function getCurrentWorkspace(supabase: SupabaseClient): Promise<Workspace | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("workspaces")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as Workspace) ?? null;
}
