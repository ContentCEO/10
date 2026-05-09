"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/business", label: "Business profile" },
  { href: "/dashboard/audit", label: "SEO audit" },
  { href: "/dashboard/checklist", label: "Checklist" },
  { href: "/dashboard/plan", label: "Improvement plan" },
  { href: "/dashboard/reviews", label: "Review responder" },
  { href: "/dashboard/keywords", label: "Keyword ideas" },
  { href: "/dashboard/competitors", label: "Competitors" },
  { href: "/dashboard/tasks", label: "Task tracker" },
  { href: "/dashboard/report", label: "Monthly report" },
  { href: "/dashboard/billing", label: "Billing" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white px-3 py-6 lg:block">
      <Link href="/" className="mb-6 block px-3 text-base font-semibold text-brand-700">
        LocalRank<span className="text-brand-500">AI</span>
      </Link>
      <nav className="space-y-1">
        {links.map((l) => {
          const active = pathname === l.href || (l.href !== "/dashboard" && pathname.startsWith(l.href));
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`block rounded-md px-3 py-2 text-sm transition ${
                active ? "bg-brand-50 font-medium text-brand-700" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
