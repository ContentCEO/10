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
  FileText,
  Compass,
  Gift,
  Globe,
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
  Voicemail,
  Workflow,
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
      { href: "/distribution",  label: "Routes",        icon: Compass },
      { href: "/lead-gen",      label: "Capture form",  icon: Megaphone },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/marketing-hub", label: "Marketing hub", icon: Megaphone },
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
      { href: "/voicemails",    label: "Voicemails",    icon: Voicemail },
      { href: "/sequences",     label: "Sequences",     icon: Workflow },
      { href: "/proposals",     label: "Proposals",     icon: FileText },
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
      { href: "/profile",        label: "My profile",     icon: UserCircle },
      { href: "/partnerships",   label: "Partnerships",   icon: Handshake },
      { href: "/lsa-setup",      label: "Google LSA",     icon: ShieldCheck },
      { href: "/custom-domain",  label: "Custom domain",  icon: Globe },
      { href: "/billing",        label: "Billing",        icon: Wallet },
    ],
  },
];

export function Sidebar({ email }: { email: string | null }) {
  const path = usePathname();
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 border-r border-ink-200/70 bg-white/80 backdrop-blur overflow-y-auto scrollbar-thin">
      <div className="px-5 py-4 border-b border-ink-200/70 sticky top-0 bg-white/90 backdrop-blur z-10">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold tracking-tight group">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow transition-transform group-hover:scale-105">
            CF
          </span>
          <span className="gradient-text">ContractorFlow</span>
        </Link>
      </div>
      <nav className="flex-1 px-2.5 py-4 space-y-5">
        {SECTIONS.map((section, idx) => (
          <div key={section.label ?? `solo-${idx}`}>
            {section.label && (
              <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.14em] text-ink-400 font-semibold">
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
                      "group relative flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-gradient-to-r from-brand-50 to-brand-100/40 text-brand-700 shadow-soft ring-1 ring-inset ring-brand-200/60"
                        : "text-ink-700 hover:bg-ink-50 hover:text-ink-900",
                    )}
                  >
                    {active && (
                      <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-brand-gradient" />
                    )}
                    <Icon className={cn(
                      "h-4 w-4 transition-colors shrink-0",
                      active ? "text-brand-600" : "text-ink-500 group-hover:text-ink-700",
                    )} />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <form action="/auth/signout" method="post"
        className="border-t border-ink-200/70 px-3 py-3 sticky bottom-0 bg-white/90 backdrop-blur">
        <div className="px-2 pb-2 text-xs text-ink-500 truncate" title={email ?? ""}>{email}</div>
        <button className="btn-secondary w-full justify-start">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </form>
    </aside>
  );
}
