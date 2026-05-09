"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hammer, LayoutDashboard, FilePlus2, CreditCard, LogOut } from "lucide-react";
import clsx from "clsx";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/proposals/new", label: "New proposal", icon: FilePlus2 },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

export function Sidebar({ email }: { email: string | null }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-gray-200 bg-white md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-5 font-semibold text-gray-900">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
          <Hammer size={18} />
        </span>
        ProposalPro <span className="text-brand-600">AI</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                active ? "bg-brand-50 text-brand-700" : "text-gray-700 hover:bg-gray-100",
              )}>
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-gray-200 p-3">
        <div className="px-2 pb-2 text-xs text-gray-500 truncate">{email ?? ""}</div>
        <form action="/api/auth/signout" method="post">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100">
            <LogOut size={18} /> Log out
          </button>
        </form>
      </div>
    </aside>
  );
}

export function MobileTopbar() {
  return (
    <div className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
      <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-white">
          <Hammer size={16} />
        </span>
        ProposalPro <span className="text-brand-600">AI</span>
      </Link>
      <Link href="/proposals/new" className="btn-primary px-3 py-1.5 text-xs">
        <FilePlus2 size={14} /> New
      </Link>
    </div>
  );
}
