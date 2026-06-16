"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, Settings, Sliders, Wallet, X } from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
  user: { email: string; businessName: string | null };
}

const EMERALD = "#10b981";

const NAV = [
  { href: "/dashboard",        label: "Leads",        icon: LayoutDashboard, exact: true },
  { href: "/wallet",           label: "Wallet",        icon: Wallet,          exact: false },
  { href: "/preferences",      label: "Preferences",   icon: Sliders,         exact: false },
  { href: "/account",          label: "Account",       icon: Settings,        exact: false },
];

export function AppShell({ children, user }: AppShellProps) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (user.businessName || user.email).split(/[\s@]/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("").slice(0, 2);

  return (
    <div className="min-h-screen flex" style={{ background: "#06060A", color: "#fff" }}>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 backdrop-blur-md"
        style={{ background: "rgba(6, 6, 10, 0.85)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => setMobileOpen((v) => !v)} className="text-white" aria-label="Menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${EMERALD}, #059669)` }}>CF</span>
            <span className="text-sm font-semibold">Marketplace</span>
          </div>
          <div className="w-5" />
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-30 h-screen w-64 shrink-0 transition-transform lg:transition-none ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "#0a0a13", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="px-5 py-5">
          <Link href="/dashboard" className="flex items-center gap-2 text-white font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${EMERALD}, #059669)`, boxShadow: `0 6px 16px -4px ${EMERALD}66` }}>CF</span>
            <span>
              <span className="block text-sm">Contractor Flow</span>
              <span className="block text-xs" style={{ color: EMERALD }}>Marketplace</span>
            </span>
          </Link>
        </div>

        <nav className="px-3 mt-2">
          <div className="text-[10px] uppercase tracking-wider font-mono px-3 mb-1.5"
            style={{ color: "rgba(255,255,255,0.40)" }}>Workspace</div>
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = item.exact ? path === item.href : path.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
                style={{
                  color: active ? "#fff" : "rgba(255,255,255,0.65)",
                  background: active ? `${EMERALD}14` : "transparent",
                  borderLeft: active ? `2px solid ${EMERALD}` : "2px solid transparent",
                  paddingLeft: active ? 10 : 12,
                }}>
                <Icon className="h-4 w-4" style={{ color: active ? EMERALD : "currentColor" }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User block */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full grid place-items-center text-xs font-bold text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${EMERALD}, #059669)` }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{user.businessName ?? user.email.split("@")[0]}</div>
              <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.50)" }}>{user.email}</div>
            </div>
          </div>
          <form action="/auth/signout" method="POST">
            <button type="submit"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.78)" }}>
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Click-outside for mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <main className="flex-1 min-w-0 pt-14 lg:pt-0">
        <div className="max-w-5xl mx-auto p-5 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
