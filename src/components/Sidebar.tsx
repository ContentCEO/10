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
  PenLine,
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
  Sliders,
  Sparkles,
  TrendingUp,
  UserCircle,
  Users,
  Wallet,
  Wrench,
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
  adminOnly?: boolean;
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
      { href: "/leads",         label: "Pipeline",      icon: Briefcase },
      { href: "/marketplace",   label: "Marketplace",   icon: ShoppingCart },
      { href: "/opportunities", label: "Lead sources",  icon: Activity },
      { href: "/auto-bid",      label: "AI auto-bid",   icon: Bot },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/inbox",         label: "Inbox",         icon: MessageSquare },
      { href: "/voicemails",    label: "Voicemails",    icon: Voicemail },
      { href: "/proposals",     label: "Proposals",     icon: FileText },
      { href: "/sequences",     label: "Sequences",     icon: Workflow },
      { href: "/calendar",      label: "Follow-ups",    icon: CalendarClock },
      { href: "/customers",     label: "Customers",     icon: Users },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/marketing-hub",     label: "Marketing hub",   icon: Megaphone },
      { href: "/content-studio",    label: "Content studio",  icon: PenLine },
      { href: "/neighbor-outreach", label: "Neighborhood",    icon: Compass },
      { href: "/referrals",         label: "Referrals",       icon: Gift },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/jobs",     label: "Jobs",     icon: Hammer },
      { href: "/booking",  label: "Booking",  icon: Calendar },
      { href: "/invoices", label: "Invoices", icon: Receipt },
      { href: "/team",     label: "Team",     icon: HardHat },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/grow",         label: "Grow hub",     icon: TrendingUp },
      { href: "/playbook-200", label: "200/day plan", icon: Rocket },
      { href: "/partnerships", label: "Partnerships", icon: Handshake },
      { href: "/lsa-setup",    label: "Google LSAs",  icon: ShieldCheck },
      { href: "/integrations", label: "Integrations", icon: Plug },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/profile",       label: "Profile",       icon: UserCircle },
      { href: "/preferences",   label: "Preferences",   icon: Sliders },
      { href: "/lead-gen",      label: "Capture form",  icon: Megaphone },
      { href: "/widget",        label: "Embed widgets", icon: Code },
      { href: "/distribution",  label: "Routes",        icon: Compass },
      { href: "/custom-domain", label: "Custom domain", icon: Globe },
      { href: "/billing",       label: "Billing",       icon: Wallet },
    ],
  },
  {
    label: "Admin · Overseer",
    adminOnly: true,
    items: [
      { href: "/owner/control",     label: "Mission Control",  icon: ShieldCheck },
      { href: "/owner",             label: "Overseer (live)",  icon: Activity },
      { href: "/admin",             label: "Admin overview",   icon: ShieldCheck },
      { href: "/admin/marketplace", label: "All leads (firehose)", icon: ShoppingCart },
      { href: "/admin/curation",    label: "Curation queue",   icon: Sparkles },
      { href: "/admin/users",       label: "Users",            icon: Users },
      { href: "/admin/lead-paste",  label: "Manual paste",     icon: Wrench },
    ],
  },
];

export function Sidebar({ email, isAdmin }: { email: string | null; isAdmin?: boolean }) {
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
        {SECTIONS.filter((s) => !s.adminOnly || isAdmin).map((section, idx) => (
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
                      "group relative flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                      active
                        ? "bg-brand-50/60 text-brand-700"
                        : "text-ink-700 hover:bg-ink-50 hover:text-ink-900",
                    )}
                  >
                    {active && (
                      <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand-500" />
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
