import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/leads", label: "Lead inbox" },
  { href: "/dashboard/business", label: "Business profile" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" }
];

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: business } = await supabase
    .from("businesses")
    .select("id,name")
    .eq("owner_id", user.id)
    .maybeSingle();

  const { count: unread } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-brand-600" />
            <Link href="/dashboard" className="font-semibold">
              CallBack AI
            </Link>
            {business?.name && (
              <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 sm:inline">
                {business.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-500 md:inline">{user.email}</span>
            {unread != null && unread > 0 && (
              <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-medium text-white">
                {unread} new
              </span>
            )}
            <form action="/api/auth/signout" method="post">
              <button className="text-slate-600 hover:text-slate-900">Sign out</button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 px-4 pb-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
