import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Pull business name from profile if available — falls back to email handle.
  let businessName: string | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("business_name")
      .eq("id", user.id)
      .maybeSingle();
    businessName = (data as { business_name?: string } | null)?.business_name ?? null;
  } catch {
    // ignore — fallback to email
  }

  return (
    <AppShell user={{ email: user.email ?? "", businessName }}>
      {children}
    </AppShell>
  );
}
