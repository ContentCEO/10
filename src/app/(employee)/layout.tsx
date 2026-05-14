import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutDashboard, ListChecks, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("account_type").eq("id", user.id).single();
  if (profile?.account_type === "homeowner")   redirect("/home");
  if (profile?.account_type === "contractor")  redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-5 py-4 flex items-center justify-between">
          <Link href="/work" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
              CF
            </span>
            <span className="gradient-text">ContractorFlow · Crew</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link href="/work" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <LayoutDashboard className="h-4 w-4" /> Today
            </Link>
            <Link href="/work/tasks" className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <ListChecks className="h-4 w-4" /> Tasks
            </Link>
            <form action="/auth/signout" method="post">
              <button className="btn-secondary !py-1.5 text-xs">
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-6">{children}</main>
    </div>
  );
}
