"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, LogOut, Menu, Moon, Settings, Shield, Sliders, Sun, Wallet, X } from "lucide-react";
import { ThemeProvider, useTheme } from "./ThemeProvider";

interface AppShellProps {
  children: React.ReactNode;
  user: { email: string; businessName: string | null };
}

const EMERALD = "#10b981";

const NAV = [
  { href: "/dashboard",        label: "Leads",         icon: LayoutDashboard, exact: true  },
  { href: "/verification",     label: "Verification",  icon: Shield,          exact: false },
  { href: "/wallet",           label: "Wallet",        icon: Wallet,          exact: false },
  { href: "/preferences",      label: "Preferences",   icon: Sliders,         exact: false },
  { href: "/account",          label: "Account",       icon: Settings,        exact: false },
];

// Outer wrapper provides theme context to the whole authenticated app.
export function AppShell(props: AppShellProps) {
  return (
    <ThemeProvider defaultTheme="dark">
      <AppShellInner {...props} />
    </ThemeProvider>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      className="h-9 w-9 grid place-items-center rounded-lg transition"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        color: "var(--text-muted)",
      }}>
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}

function AppShellInner({ children, user }: AppShellProps) {
  const path = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = (user.businessName || user.email).split(/[\s@]/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("").slice(0, 2);

  return (
    <div className="min-h-screen flex" style={{ background: "var(--canvas)", color: "var(--text)" }}>
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 backdrop-blur-md"
        style={{ background: "color-mix(in srgb, var(--canvas) 85%, transparent)", borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => setMobileOpen((v) => !v)} style={{ color: "var(--text)" }} aria-label="Menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${EMERALD}, #059669)` }}>CF</span>
            <span className="text-sm font-semibold">Marketplace</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed lg:sticky top-0 left-0 z-30 h-screen w-64 shrink-0 transition-transform lg:transition-none ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        style={{ background: "color-mix(in srgb, var(--canvas) 92%, var(--text) 8%)", borderRight: "1px solid var(--border)" }}>
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
                  color: active ? "var(--text)" : "var(--text-muted)",
                  background: active ? "var(--emerald-soft)" : "transparent",
                  borderLeft: active ? `2px solid var(--emerald)` : "2px solid transparent",
                  paddingLeft: active ? 10 : 12,
                }}>
                <Icon className="h-4 w-4" style={{ color: active ? "var(--emerald)" : "currentColor" }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User block + theme toggle (desktop) */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="hidden lg:flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-wider font-mono" style={{ color: "var(--text-faint)" }}>Theme</div>
            <ThemeToggle />
          </div>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full grid place-items-center text-xs font-bold text-white shrink-0"
              style={{ background: `linear-gradient(135deg, ${EMERALD}, #059669)` }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold truncate">{user.businessName ?? user.email.split("@")[0]}</div>
              <div className="text-xs truncate" style={{ color: "var(--text-faint)" }}>{user.email}</div>
            </div>
          </div>
          <form action="/auth/signout" method="POST">
            <button type="submit"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
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
        <div className="max-w-6xl mx-auto p-5 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
