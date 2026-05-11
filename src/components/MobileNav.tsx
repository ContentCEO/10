"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Hammer,
  LayoutDashboard,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Sparkles },
  { href: "/marketplace", label: "Market", icon: ShoppingCart },
  { href: "/jobs", label: "Jobs", icon: Hammer },
  { href: "/customers", label: "People", icon: Users },
];

export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-slate-200 bg-white">
      <ul className="grid grid-cols-5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <li key={href}>
              <Link href={href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2 text-xs",
                  active ? "text-brand-600" : "text-slate-500",
                )}>
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
