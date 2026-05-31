"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Award,
  BarChart3,
  Battery,
  Bot,
  Briefcase,
  Calendar,
  CalendarClock,
  Camera,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Code,
  FileCode,
  FileText,
  PenLine,
  Compass,
  Copy,
  Crown,
  Download,
  Gauge,
  Gift,
  Globe,
  Hammer,
  Handshake,
  HardHat,
  Layers,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Mail,
  Megaphone,
  MessageCircle,
  MessageSquare,
  MapPin,
  Package,
  Phone,
  Plug,
  Receipt,
  Recycle,
  Repeat,
  Rocket,
  Scale,
  Voicemail,
  Workflow,
  ShieldCheck,
  ShoppingCart,
  Sliders,
  Sparkles,
  Store,
  TrendingUp,
  Trophy,
  UploadCloud,
  UserCircle,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CFModule } from "@/lib/subscriptions";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  module?: CFModule;            // hide unless user has this module
}

interface NavSection {
  label: string | null;        // null = always-visible solo item
  items: NavItem[];
  adminOnly?: boolean;
  ownerOnly?: boolean;
  module?: CFModule;           // hide entire section unless user has this module
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
    label: "Launchpad",
    module: "cf-launchpad",
    items: [
      { href: "/launchpad",          label: "Dashboard",         icon: Rocket },
      { href: "/launchpad/website",  label: "Website",           icon: Globe },
      { href: "/launchpad/ads",      label: "Ad campaigns",      icon: TrendingUp },
      { href: "/launchpad/reports",  label: "Monthly reports",   icon: FileText },
      { href: "/launchpad/messages", label: "Messages",          icon: MessageSquare },
    ],
  },
  {
    label: "Leads",
    items: [
      { href: "/leads",         label: "Pipeline",      icon: Briefcase },
      { href: "/marketplace",   label: "Marketplace",   icon: ShoppingCart, module: "cf-marketplace" },
      { href: "/opportunities", label: "Lead sources",  icon: Activity },
      { href: "/auto-bid",      label: "AI auto-bid",   icon: Bot },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/inbox",         label: "Inbox",         icon: MessageSquare },
      { href: "/voicemails",    label: "Voicemails",    icon: Voicemail },
      { href: "/calls",         label: "Call log",      icon: Phone },
      { href: "/tools/quick-estimate",label: "Quick estimate",  icon: CircleDollarSign },
      { href: "/proposals",           label: "Proposals",       icon: FileText },
      { href: "/proposals/templates", label: "Proposal templates", icon: FileText },
      { href: "/change-orders",       label: "Change orders",   icon: FileText },
      { href: "/sequences",           label: "Sequences",       icon: Workflow },
      { href: "/calendar",      label: "Follow-ups",    icon: CalendarClock },
      { href: "/customers",     label: "Customers",     icon: Users },
      { href: "/customers/ltv", label: "Customer LTV",  icon: Crown },
      { href: "/customers/import", label: "Import CSV", icon: UploadCloud },
      { href: "/customers/duplicates", label: "Customer dupes", icon: Copy },
      { href: "/customers/vip",     label: "VIP customers",   icon: Crown },
      { href: "/leads/duplicates", label: "Duplicates",  icon: Copy },
      { href: "/leads/bulk",       label: "Bulk actions", icon: Layers },
      { href: "/leads/recycle",    label: "Recycle bin",  icon: Recycle },
      { href: "/leads/estimates-calendar", label: "Estimates calendar", icon: Calendar },
    ],
  },
  {
    label: "Marketing",
    items: [
      { href: "/marketing-hub",            label: "Marketing hub",  icon: Megaphone },
      { href: "/marketing-hub/broadcast",  label: "Bulk SMS",       icon: Megaphone },
      { href: "/marketing-hub/email-broadcast", label: "Bulk email", icon: Mail },
      { href: "/content-studio",         label: "Content studio",    icon: PenLine },
      { href: "/tools/social-captions",  label: "Social captions",   icon: Sparkles },
      { href: "/tools/email-signature",  label: "Email signature",   icon: PenLine },
      { href: "/tools/seo-checklist",    label: "Local SEO checklist", icon: TrendingUp },
      { href: "/tools/yard-sign-qr",     label: "Yard sign QR",      icon: PenLine },
      { href: "/tools/door-hanger",      label: "Door hanger",       icon: PenLine },
      { href: "/neighbor-outreach",      label: "Neighborhood",      icon: Compass },
      { href: "/referrals",              label: "Referrals",         icon: Gift },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/jobs",              label: "Jobs",              icon: Hammer },
      { href: "/jobs/profitability",label: "Job P&L",           icon: BarChart3 },
      { href: "/job-templates",     label: "Job templates",     icon: FileCode },
      { href: "/dispatch",      label: "Dispatch",      icon: Users },
      { href: "/route-plan",    label: "Route plan",    icon: Compass },
      { href: "/booking",  label: "Booking",  icon: Calendar },
      { href: "/portfolio",label: "Photo portfolio", icon: Camera },
      { href: "/invoices", label: "Invoices", icon: Receipt },
      { href: "/expenses", label: "Expenses", icon: Receipt },
      { href: "/tools/deposit-link",   label: "Deposit link",   icon: CircleDollarSign },
      { href: "/tools/pricing-engine", label: "Pricing engine", icon: TrendingUp },
      { href: "/tools/lien-waiver",        label: "Lien waiver",        icon: FileText },
      { href: "/tools/contract-clauses",   label: "Contract clauses",   icon: FileText },
      { href: "/team",            label: "Team",           icon: HardHat },
      { href: "/subcontractors",  label: "Subcontractors", icon: HardHat },
      { href: "/vendors",         label: "Vendors",        icon: Store },
      { href: "/equipment",       label: "Equipment",      icon: Wrench },
      { href: "/materials",       label: "Material prices",icon: Package },
      { href: "/compliance",      label: "Compliance",     icon: ShieldCheck },
      { href: "/documents",       label: "Documents",      icon: FileText },
      { href: "/team/timesheet",     label: "Timesheet",         icon: Clock },
      { href: "/team/profitability", label: "Team profitability", icon: Trophy },
      { href: "/team/capacity",      label: "Capacity",           icon: Battery },
    ],
  },
  {
    label: "Growth",
    items: [
      { href: "/grow",                   label: "Grow hub",         icon: TrendingUp },
      { href: "/grow/source-roi",        label: "Source ROI",       icon: TrendingUp },
      { href: "/grow/recurring-revenue", label: "Recurring revenue",icon: Repeat },
      { href: "/grow/service-profit",    label: "Service profit",   icon: TrendingUp },
      { href: "/grow/win-loss",          label: "Win / loss",       icon: Award },
      { href: "/grow/velocity",          label: "Sales velocity",   icon: Gauge },
      { href: "/grow/service-area",      label: "Service area map", icon: Compass },
      { href: "/grow/cost-variance",     label: "Cost variance",    icon: Scale },
      { href: "/grow/satisfaction",      label: "Satisfaction",     icon: MessageCircle },
      { href: "/grow/hours-accuracy",    label: "Hours accuracy",   icon: Clock },
      { href: "/grow/lead-heatmap",      label: "Lead heatmap",     icon: Calendar },
      { href: "/grow/zip-performance",   label: "ZIP performance",  icon: MapPin },
      { href: "/grow/daily-revenue",     label: "Daily revenue",    icon: TrendingUp },
      { href: "/grow/cash-flow",         label: "Cash flow",        icon: Wallet },
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
      { href: "/account/modules", label: "Modules",     icon: Sparkles },
      { href: "/settings/export", label: "Data export",  icon: Download },
    ],
  },
  {
    label: "Owner",
    ownerOnly: true,
    items: [
      { href: "/owner/setup-plan",    label: "Setup plan (start here)", icon: Activity },
      { href: "/owner/control/board", label: "Agent board",      icon: Bot },
      { href: "/owner",               label: "Overseer (live)",  icon: Activity },
      // The lead-gen tooling below is the Marketplace module — only
      // visible to users who hold the cf-marketplace subscription
      // (owner auto-grants all modules).
      { href: "/owner/scrapers",      label: "Scraper health",   icon: Activity, module: "cf-marketplace" },
      { href: "/owner/lead-gen-roi",  label: "Lead-gen ROI",     icon: Activity, module: "cf-marketplace" },
      { href: "/owner/insights",      label: "Weekly insights",  icon: Activity, module: "cf-marketplace" },
      { href: "/owner/meta-setup",    label: "Facebook Lead Ads", icon: Activity, module: "cf-marketplace" },
      { href: "/owner/lob-setup",     label: "Auto postcards",   icon: Activity, module: "cf-marketplace" },
      { href: "/owner/vapi-setup",    label: "Voice receptionist", icon: Activity, module: "cf-marketplace" },
    ],
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [
      { href: "/admin/insights",    label: "Insights",            icon: TrendingUp },
      { href: "/admin/cron",        label: "Cron schedule",       icon: Activity },
      { href: "/admin/audit",       label: "Audit log",           icon: ShieldCheck },
      { href: "/admin/marketplace", label: "All leads (firehose)",icon: ShoppingCart, module: "cf-marketplace" },
      { href: "/admin/curation",    label: "Curation queue",      icon: Sparkles, module: "cf-marketplace" },
      { href: "/admin/users",       label: "Users",               icon: Users },
      { href: "/admin/lead-paste",  label: "Manual paste",     icon: Wrench },
    ],
  },
];

const STORAGE_KEY = "cf:sidebar-expanded";

function sectionContainsActive(section: NavSection, path: string): boolean {
  return section.items.some((it) => path === it.href || path.startsWith(it.href + "/"));
}

export function Sidebar({
  email, isAdmin, isOwner, modules = [],
}: { email: string | null; isAdmin?: boolean; isOwner?: boolean; modules?: CFModule[] }) {
  const path = usePathname();
  const moduleSet = new Set(modules);

  // Which sections are expanded? Default: only the section containing the
  // current page. Persist on every toggle.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let restored: string[] | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) restored = JSON.parse(raw) as string[];
    } catch { /* ignore */ }

    const next = new Set<string>();
    // Start from persisted choice if present, else empty.
    if (restored) restored.forEach((s) => next.add(s));
    // Always ensure the section containing the active page is open.
    for (const s of SECTIONS) {
      if (s.label && sectionContainsActive(s, path)) next.add(s.label);
    }
    setExpanded(next);
  }, [path]);

  function toggle(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-64 border-r border-white/5 bg-[#0b0b14]/90 backdrop-blur overflow-y-auto scrollbar-thin">
      <div className="px-5 py-4 border-b border-white/5 sticky top-0 bg-[#0b0b14]/95 backdrop-blur z-10">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-semibold tracking-tight group">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow transition-transform group-hover:scale-105">
            CF
          </span>
          <span className="gradient-text">ContractorFlow</span>
        </Link>
      </div>
      <nav className="flex-1 px-2.5 py-4 space-y-3">
        {SECTIONS.filter((s) => {
          if (s.ownerOnly && !isOwner) return false;
          if (s.adminOnly && !isAdmin) return false;
          if (s.module && !moduleSet.has(s.module)) return false;
          return true;
        }).map((section, idx) => {
          // Per-item module gating: hide individual links the user lacks.
          const visibleItems = section.items.filter(
            (it) => !it.module || moduleSet.has(it.module),
          );
          if (visibleItems.length === 0) return null;
          const isCollapsible = !!section.label;
          const isOpen = !isCollapsible || expanded.has(section.label!);
          const activeCount = visibleItems.filter(
            (it) => path === it.href || path.startsWith(it.href + "/"),
          ).length;

          return (
            <div key={section.label ?? `solo-${idx}`}>
              {isCollapsible && (
                <button
                  type="button"
                  onClick={() => toggle(section.label!)}
                  aria-expanded={isOpen}
                  className="w-full px-3 mb-1.5 flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-white/40 font-semibold hover:text-white transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 shrink-0 transition-transform duration-200",
                      isOpen ? "rotate-0" : "-rotate-90",
                    )}
                  />
                  <span className="flex-1 text-left">{section.label}</span>
                  {activeCount > 0 && (
                    <span className="text-[9px] text-brand-600 normal-case tracking-normal font-bold">
                      ●
                    </span>
                  )}
                </button>
              )}
              {isOpen && (
                <div className="space-y-0.5">
                  {visibleItems.map(({ href, label, icon: Icon }) => {
                    const active = path === href || path.startsWith(href + "/");
                    return (
                      <Link
                        key={href} href={href}
                        className={cn(
                          "group relative flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                          active
                            ? "bg-brand-500/15 text-brand-200"
                            : "text-white/70 hover:bg-white/5 hover:text-white",
                        )}
                      >
                        {active && (
                          <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-brand-400" />
                        )}
                        <Icon className={cn(
                          "h-4 w-4 transition-colors shrink-0",
                          active ? "text-brand-300" : "text-white/50 group-hover:text-white/90",
                        )} />
                        <span className="truncate">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <form action="/auth/signout" method="post"
        className="border-t border-white/5 px-3 py-3 sticky bottom-0 bg-[#0b0b14]/95 backdrop-blur">
        <div className="px-2 pb-2 text-xs text-white/40 truncate" title={email ?? ""}>{email}</div>
        <button className="btn-secondary w-full justify-start">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </form>
    </aside>
  );
}
