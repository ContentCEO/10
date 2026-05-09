"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/dashboard", label: "Generate" },
  { href: "/dashboard/calendar", label: "Calendar" },
  { href: "/dashboard/drafts", label: "Drafts" },
  { href: "/dashboard/profile", label: "Business profile" },
  { href: "/dashboard/billing", label: "Billing" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-6">
      <Link href="/dashboard" className="px-2 mb-6 text-base font-semibold">
        <span className="text-brand-600">●</span> LocalContent AI
      </Link>
      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm ${
                active ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <button onClick={signOut} className="btn-ghost mt-4 justify-start text-sm">
        Sign out
      </button>
    </aside>
  );
}
