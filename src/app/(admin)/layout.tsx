import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Building2, ClipboardCheck, LogOut, ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!(profile?.is_admin ?? false)) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto max-w-6xl px-5 py-4 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient shadow-glow">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span>ContractorFlow · Admin</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/admin" className="hover:text-slate-300 flex items-center gap-1">
              <Activity className="h-4 w-4" /> Overview
            </Link>
            <Link href="/admin/users" className="hover:text-slate-300 flex items-center gap-1">
              <Users className="h-4 w-4" /> Users
            </Link>
            <Link href="/admin/marketplace" className="hover:text-slate-300 flex items-center gap-1">
              <Building2 className="h-4 w-4" /> Marketplace
            </Link>
            <Link href="/admin/curation" className="hover:text-slate-300 flex items-center gap-1">
              <ClipboardCheck className="h-4 w-4" /> Curation
            </Link>
            <form action="/auth/signout" method="post">
              <button className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg">
                <LogOut className="h-3.5 w-3.5 inline mr-1" /> Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>
    </div>
  );
}
