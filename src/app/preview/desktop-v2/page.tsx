"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Activity, ArrowRight, ArrowUpRight, Bell, Bot, Briefcase, CalendarClock,
  Check, ChevronDown, CircleDollarSign, Command, Filter, FileText,
  Hammer, HardHat, Home, LayoutDashboard, LineChart, type LucideIcon,
  Megaphone, MessageSquare, Plus, Search, Settings, ShoppingCart,
  Sparkles, Star, TrendingUp, UserCircle, Users, Wallet, Zap,
} from "lucide-react";

/*
 * /preview/desktop-v2
 *
 * Sandbox preview of the upgraded desktop-app shell:
 *   - Dark theme matching the new landing
 *   - Narrower icon+label sidebar with section headers
 *   - Sticky top bar with search, notifications, profile
 *   - Glass cards with rings, animated KPIs, gradient accents
 *
 * Mocked data — no DB. If approved, this layout becomes the in-app default
 * and we roll it across dashboard / leads / jobs / customers / etc.
 */

const NAV: { label: string | null; items: { href: string; label: string; icon: LucideIcon; badge?: string }[] }[] = [
  { label: null, items: [
    { href: "#dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "#getstarted", label: "Get started", icon: Sparkles },
  ]},
  { label: "Leads", items: [
    { href: "#pipeline", label: "Pipeline", icon: Briefcase, badge: "47" },
    { href: "#marketplace", label: "Marketplace", icon: ShoppingCart, badge: "12" },
    { href: "#opportunities", label: "Lead sources", icon: Activity },
    { href: "#autobid", label: "AI auto-bid", icon: Bot },
  ]},
  { label: "Sales", items: [
    { href: "#inbox", label: "Inbox", icon: MessageSquare, badge: "3" },
    { href: "#proposals", label: "Proposals", icon: FileText },
    { href: "#calendar", label: "Follow-ups", icon: CalendarClock, badge: "5" },
    { href: "#customers", label: "Customers", icon: Users },
  ]},
  { label: "Operations", items: [
    { href: "#jobs", label: "Jobs", icon: Hammer },
    { href: "#team", label: "Team", icon: HardHat },
  ]},
];

const KPIS = [
  { label: "Leads",   value: "47",      delta: "+18%", tone: "from-indigo-500 to-violet-500" },
  { label: "Active jobs", value: "12",  delta: "+3",   tone: "from-violet-500 to-fuchsia-500" },
  { label: "Revenue MTD", value: "$48,200", delta: "+22%", tone: "from-emerald-500 to-teal-500" },
  { label: "Due today", value: "5",     delta: "—",    tone: "from-amber-500 to-orange-500" },
];

const RECENT_LEADS = [
  { name: "Maria S.", svc: "Bathroom remodel", price: "$12,400", tag: "Estimate", tone: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  { name: "Chen K.",  svc: "Deck build",       price: "$8,200",  tag: "Won",      tone: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  { name: "Priya R.", svc: "Fence install",    price: "$3,200",  tag: "Contacted",tone: "bg-blue-500/15 text-blue-300 ring-blue-500/30" },
  { name: "John D.",  svc: "Roof repair",      price: "$4,800",  tag: "New",      tone: "bg-white/10 text-white/80 ring-white/15" },
  { name: "Sam T.",   svc: "Driveway",         price: "$6,100",  tag: "New",      tone: "bg-white/10 text-white/80 ring-white/15" },
];

const TODAY = [
  { time: "10:30 AM", what: "Call Maria S. — bathroom remodel estimate review" },
  { time: "12:15 PM", what: "Follow-up text to Chen K. — confirm Friday start" },
  { time: "2:00 PM",  what: "On-site quote at 47 Beacon St — Priya R." },
  { time: "4:30 PM",  what: "Send proposal to Sam T. — driveway resurface" },
  { time: "EOD",      what: "Review weekly profit dashboard" },
];

export default function DesktopV2Preview() {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("#dashboard");

  return (
    <div className="relative min-h-screen flex bg-ink-950 text-white overflow-hidden">
      {/* Deep-space backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10"
           style={{
             background:
               "radial-gradient(1100px 600px at 0% -10%, rgba(99,102,241,0.22), transparent 60%), radial-gradient(900px 700px at 100% 50%, rgba(6,182,212,0.12), transparent 60%), linear-gradient(180deg, #0a0f1f 0%, #0c1224 100%)",
           }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05]"
           style={{
             backgroundImage:
               "linear-gradient(to right, rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,1) 1px, transparent 1px)",
             backgroundSize: "32px 32px",
             maskImage: "radial-gradient(ellipse 80% 60% at 50% 20%, black 30%, transparent 80%)",
           }}
      />

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`${collapsed ? "w-[72px]" : "w-64"} shrink-0 border-r border-white/5 bg-white/[0.02] backdrop-blur-xl flex flex-col transition-all duration-300`}>
        <div className="px-4 py-4 border-b border-white/5 flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow shrink-0">CF</span>
          {!collapsed && <span className="font-semibold tracking-tight bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">ContractorFlow</span>}
        </div>
        <nav className="flex-1 px-2 py-4 space-y-5 overflow-y-auto scrollbar-thin">
          {NAV.map((section, idx) => (
            <div key={section.label ?? `solo-${idx}`}>
              {section.label && !collapsed && (
                <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-white/40 font-semibold">{section.label}</div>
              )}
              <div className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon, badge }) => {
                  const isActive = active === href;
                  return (
                    <button
                      key={href}
                      onClick={() => setActive(href)}
                      className={
                        isActive
                          ? "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium bg-white/10 text-white ring-1 ring-white/15"
                          : "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/5 hover:text-white"
                      }
                      title={collapsed ? label : undefined}
                    >
                      <Icon className={isActive ? "h-4 w-4 text-brand-300 shrink-0" : "h-4 w-4 shrink-0"} />
                      {!collapsed && <span className="truncate flex-1 text-left">{label}</span>}
                      {!collapsed && badge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-brand-500/20 text-brand-200 ring-1 ring-brand-500/30">
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/5 p-3">
          <button onClick={() => setCollapsed((c) => !c)} className="w-full flex items-center gap-2 text-xs text-white/50 hover:text-white px-2 py-2 rounded-lg hover:bg-white/5">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${collapsed ? "-rotate-90" : "rotate-90"}`} />
            {!collapsed && <span>Collapse sidebar</span>}
          </button>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-ink-950/60 border-b border-white/5">
          <div className="flex items-center gap-3 px-6 py-3">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Home className="h-3.5 w-3.5" /> Workspace · Dashboard
            </div>
            <div className="flex-1 max-w-xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search leads, jobs, customers…"
                  className="w-full bg-white/5 ring-1 ring-white/10 rounded-xl pl-10 pr-12 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-400/60"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-0.5 text-[10px] text-white/40 bg-white/5 ring-1 ring-white/10 rounded px-1.5 py-0.5">
                  <Command className="h-2.5 w-2.5" />K
                </kbd>
              </div>
            </div>
            <button className="relative p-2 rounded-lg hover:bg-white/5 text-white/70 hover:text-white">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-ink-950" />
            </button>
            <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-white/5">
              <span className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500" />
              <span className="text-sm font-medium text-white/90">Davi</span>
              <ChevronDown className="h-3.5 w-3.5 text-white/50" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-up">
          {/* Hero greeting */}
          <section className="relative overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/10 p-6 sm:p-7">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-500/30 blur-3xl" />
            <div className="absolute -left-20 -bottom-24 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Tuesday, May 12 · Lead engine live
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">Hey Reliable Roofing</span>
                </h1>
                <p className="mt-2 text-sm text-white/60 flex items-center gap-2">
                  <Wallet className="h-3.5 w-3.5" /> Wallet
                  <span className="text-white font-semibold">$482.00</span>
                  <Link href="#" className="text-brand-300 font-medium hover:underline ml-1">top up →</Link>
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href="#" className="btn bg-white/10 text-white border border-white/15 hover:bg-white/15">
                  <Plus className="h-4 w-4" /> New lead
                </Link>
                <Link href="#" className="btn bg-white text-ink-900 hover:bg-white/90 shadow-glow">
                  <ShoppingCart className="h-4 w-4" /> Marketplace
                </Link>
              </div>
            </div>
          </section>

          {/* KPI strip */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Snapshot
              </div>
              <button className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1">
                <Filter className="h-3 w-3" /> This month
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {KPIS.map((k, i) => (
                <div key={k.label}
                     className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${k.tone} p-5 shadow-glow animate-tick-up`}
                     style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="text-[10px] uppercase tracking-wider opacity-90 font-semibold">{k.label}</div>
                  <div className="mt-2 text-3xl font-bold">{k.value}</div>
                  <div className="mt-2 text-xs inline-flex items-center gap-1 bg-black/15 px-1.5 py-0.5 rounded">
                    <ArrowUpRight className="h-3 w-3" /> {k.delta}
                  </div>
                  <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/15" />
                </div>
              ))}
            </div>
          </section>

          {/* Two column: recent leads + today */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Recent leads */}
            <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 backdrop-blur p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Recent leads</h2>
                <Link href="#" className="text-sm text-brand-300 inline-flex items-center gap-1 hover:gap-1.5 transition-all">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <ul className="space-y-2">
                {RECENT_LEADS.map((l, i) => (
                  <li key={l.name}
                      className="flex items-center gap-3 rounded-xl p-3 bg-white/[0.02] ring-1 ring-white/5 hover:bg-white/[0.05] transition animate-tick-up"
                      style={{ animationDelay: `${i * 60}ms` }}>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{l.name}</div>
                      <div className="text-xs text-white/50 truncate">{l.svc}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold">{l.price}</div>
                      <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${l.tone}`}>
                        {l.tag}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Today */}
            <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 backdrop-blur p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Today</h2>
                <span className="text-xs text-white/50">5 items</span>
              </div>
              <ul className="space-y-3">
                {TODAY.map((t, i) => (
                  <li key={i} className="flex items-start gap-3 animate-tick-up"
                      style={{ animationDelay: `${i * 60}ms` }}>
                    <button className="mt-0.5 h-4 w-4 rounded border border-white/30 hover:bg-white/10 shrink-0">
                      <Check className="h-3 w-3 text-transparent" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm">{t.what}</div>
                      <div className="text-xs text-white/50 mt-0.5">{t.time}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Lead sources strip */}
          <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 backdrop-blur p-6">
            <div className="grid lg:grid-cols-2 gap-6 items-center">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-300 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" /> Live lead engine
                </div>
                <h3 className="mt-2 text-2xl font-bold tracking-tight">500+ leads pulled today</h3>
                <p className="mt-2 text-sm text-white/60">
                  13 sources humming · 100+ MA cities · electrical, plumbing, kitchen, bath, HVAC.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["Reddit", "Craigslist", "NOAA Storms", "Boston Permits", "ma-municipal ×100", "SerpAPI ×40", "Nextdoor", "FB Groups", "ISD Violations"].map((s) => (
                  <span key={s} className="text-xs font-medium px-3 py-1.5 rounded-full bg-white/5 ring-1 ring-white/10 text-white/80">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 align-middle" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Preview footer banner */}
          <section className="rounded-2xl border-2 border-dashed border-brand-400/30 p-5 text-center text-sm text-white/60">
            <strong className="text-brand-300">Preview only.</strong> This is what the in-app shell will look like across every screen
            (Dashboard / Leads / Jobs / Customers / etc.) if you approve. Mock data only — no DB queries from this page.
          </section>
        </main>
      </div>
    </div>
  );
}
