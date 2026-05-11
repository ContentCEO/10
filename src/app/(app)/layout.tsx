import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("account_type").eq("id", user.id).single();
  if (profile?.account_type === "homeowner") redirect("/home");
  if (profile?.account_type === "employee")  redirect("/work");
  if (profile?.account_type === "agency")    redirect("/agency");

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar email={user.email ?? null} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
