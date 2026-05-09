"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/leads/upload", label: "Upload CSV" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar({ workspaceName, email }: { workspaceName: string; email: string }) {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-slate-200 bg-white min-h-screen flex flex-col">
      <div className="px-5 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-brand-600 grid place-items-center text-white font-bold">L</div>
          <span className="font-semibold">LeadRevive AI</span>
        </div>
        <p className="mt-3 text-xs text-slate-500 truncate">{workspaceName}</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium ${
                active ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form action="/auth/signout" method="post" className="px-3 py-4 border-t border-slate-200">
        <p className="text-xs text-slate-500 truncate mb-2">{email}</p>
        <button className="btn-ghost w-full justify-start text-sm">Sign out</button>
      </form>
    </aside>
  );
}
