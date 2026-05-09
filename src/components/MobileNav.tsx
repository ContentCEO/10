"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/business", label: "Business" },
  { href: "/dashboard/audit", label: "Audit" },
  { href: "/dashboard/checklist", label: "Checklist" },
  { href: "/dashboard/plan", label: "Plan" },
  { href: "/dashboard/reviews", label: "Reviews" },
  { href: "/dashboard/keywords", label: "Keywords" },
  { href: "/dashboard/competitors", label: "Competitors" },
  { href: "/dashboard/tasks", label: "Tasks" },
  { href: "/dashboard/report", label: "Report" },
  { href: "/dashboard/billing", label: "Billing" },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/" className="text-base font-semibold text-brand-700">
          LocalRank<span className="text-brand-500">AI</span>
        </Link>
      </div>
      <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2">
        {links.map((l) => {
          const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs ${
                active ? "bg-brand-50 font-medium text-brand-700" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
