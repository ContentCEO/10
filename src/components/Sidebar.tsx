"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Briefcase,
  Calendar,
  CalendarClock,
  CircleDollarSign,
  Code,
  Compass,
  Gift,
  Hammer,
  Handshake,
  HardHat,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Megaphone,
  MessageSquare,
  Plug,
  Receipt,
  Rocket,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  UserCircle,
  Users,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface NavSection {
  label: string | null;        // null = always-visible solo item
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
      { href: "/onboarding",  label: "Get started", icon: Sparkles },
    ],
  },
  {
    label: "Leads",
    items: [
      { href: "/leads",         label: "Pipeline",      icon: Sparkles },
      { href: "/marketplace",   label: "Marketplace",   icon: ShoppingCart },
      { href: "/opportunities", label: "Opportunities", icon: Activity },
      { href: "/auto-bid",      label: "AI auto-bid",   icon: Bot },
      { href: "/lead-gen",      label: "Capture form",  icon: Megaphone },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/grow",          label: "Grow hub",      icon: TrendingUp },
      { href: "/playbook-200",  label: "200/day playbook", icon: Rocket },
      { href: "/integrations",  label: "Ads + webhooks",icon: Plug },
      { href: "/widget",        label: "Embed widgets", icon: Code },
      { href: "/referrals",     label: "Referrals",     icon: Gift },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/inbox",         label: "SMS inbox",     icon: MessageSquare },
      { href: "/calendar",      label: "Follow-ups",    icon: CalendarClock },
      { href: "/booking",       label: "Booking",       icon: Calendar },
      { href: "/customers",     label: "Customers",     icon: Users },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/jobs",          label: "Jobs",          icon: Hammer },
      { href: "/invoices",      label: "Invoices",      icon: Receipt },
      { href: "/team",          label: "Team",          icon: HardHat },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/profile",       label: "My profile",    icon: UserCircle },
      { href: "/partnerships",  label: "Partnerships",  icon: Handshake },
      { href: "/lsa-setup",     label: "Google LSA",    icon: ShieldCheck },
      { href: "/billing",       label: "Billing",       icon: Wallet },
    ],
  },
];

export function Sidebar({ email }: { email: string | null }) {
  const path = usePathname();
  return (
    <aside className="hidden md:flex md:flex-col md:w-60 border-r border-slate-200 bg-white overflow-y-auto">
      <div className="px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow">
            CF
          </span>
          <span className="gradient-text">ContractorFlow</span>
        </Link>
      </div>
      <nav className="flex-1 px-2 py-4 space-y-4">
        {SECTIONS.map((section, idx) => (
          <div key={section.label ?? `solo-${idx}`}>
            {section.label && (
              <div className="px-3 mb-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                {section.label}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = path === href || path.startsWith(href + "/");
                return (
                  <Link
                    key={href} href={href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                      active
                        ? "bg-brand-50 text-brand-700"
                        : "text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <form action="/auth/signout" method="post"
        className="border-t border-slate-200 px-3 py-3 sticky bottom-0 bg-white">
        <div className="px-2 pb-2 text-xs text-slate-500 truncate">{email}</div>
        <button className="btn-secondary w-full justify-start">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </form>
    </aside>
  );
}
