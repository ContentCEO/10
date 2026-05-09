import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Organization } from "@/lib/types";

/** Get the signed-in user or redirect to /login. */
export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { user, supabase };
}

/** Get the user's organization, creating one if missing. */
export async function requireOrg(): Promise<{
  org: Organization;
  user: NonNullable<Awaited<ReturnType<typeof requireUser>>["user"]>;
  supabase: ReturnType<typeof createClient>;
}> {
  const { user, supabase } = await requireUser();

  const { data: existing } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (existing) {
    return { org: existing as Organization, user, supabase };
  }

  const { data: created, error } = await supabase
    .from("organizations")
    .insert({
      owner_id: user.id,
      name:
        (user.user_metadata?.business_name as string | undefined) ||
        (user.email ? `${user.email.split("@")[0]}'s workspace` : "My Workspace"),
    })
    .select("*")
    .single();

  if (error || !created) {
    throw new Error(`Failed to create organization: ${error?.message ?? "unknown"}`);
  }
  return { org: created as Organization, user, supabase };
}
