import { redirect } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentWorkspace } from "@/lib/workspace";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const workspace = await getCurrentWorkspace(supabase);

  return (
    <div className="flex min-h-screen">
      <Sidebar workspaceName={workspace?.name ?? "My workspace"} email={user.email ?? ""} />
      <main className="flex-1 px-8 py-8">{children}</main>
    </div>
  );
}
