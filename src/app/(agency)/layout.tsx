import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("account_type").eq("id", user.id).single();
  if (profile?.account_type !== "agency") redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
          <Link href="/agency" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
              CF
            </span>
            <span className="gradient-text">ContractorFlow · Agency</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/agency" className="text-slate-600 hover:text-slate-900 flex items-center gap-1">
              <Briefcase className="h-4 w-4" /> Clients
            </Link>
            <form action="/auth/signout" method="post">
              <button className="btn-secondary !py-1.5 text-xs">
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}
