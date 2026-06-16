"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Users, Store, Rocket } from "lucide-react";

interface NavProps {
  current?: "home" | "crm" | "marketplace" | "launchpad" | "pricing" | "about";
}

export function MarketingNav({ current }: NavProps) {
  const [open, setOpen] = useState(false);

  const modules = [
    { slug: "crm",         label: "CRM",         icon: Users,  accent: "#6366f1" },
    { slug: "marketplace", label: "Marketplace", icon: Store,  accent: "#10b981" },
    { slug: "launchpad",   label: "Launchpad",   icon: Rocket, accent: "#f97316" },
  ] as const;

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md"
      style={{ background: "rgba(6, 6, 10, 0.78)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white tracking-tight">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-white text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>CF</span>
          <span style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 22 }}>Contractor Flow</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {modules.map((m) => {
            const Icon = m.icon;
            const active = current === m.slug;
            return (
              <Link key={m.slug} href={`/${m.slug}`}
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: active ? "#fff" : "rgba(255,255,255,0.70)",
                  background: active ? `${m.accent}1a` : "transparent",
                  border: active ? `1px solid ${m.accent}40` : "1px solid transparent",
                }}>
                <Icon className="h-3.5 w-3.5" style={{ color: m.accent }} />
                {m.label}
              </Link>
            );
          })}
          <Link href="/pricing"
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ color: current === "pricing" ? "#fff" : "rgba(255,255,255,0.70)" }}>
            Pricing
          </Link>
          <Link href="/login"
            className="ml-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{ color: "rgba(255,255,255,0.85)" }}>
            Sign in
          </Link>
          <Link href="/signup"
            className="ml-1 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              boxShadow: "0 6px 16px -4px #6366f188",
            }}>
            Get started
          </Link>
        </nav>

        {/* Mobile menu toggle */}
        <button className="md:hidden text-white" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <div className="max-w-6xl mx-auto px-5 py-3 flex flex-col gap-1">
            {modules.map((m) => {
              const Icon = m.icon;
              return (
                <Link key={m.slug} href={`/${m.slug}`} onClick={() => setOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
                  style={{ color: "rgba(255,255,255,0.85)" }}>
                  <Icon className="h-4 w-4" style={{ color: m.accent }} />
                  {m.label}
                </Link>
              );
            })}
            <Link href="/pricing" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>Pricing</Link>
            <Link href="/login" onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-lg text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>Sign in</Link>
            <Link href="/signup" onClick={() => setOpen(false)}
              className="mt-1 px-3 py-2.5 rounded-lg text-sm font-semibold text-center text-white"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
              Get started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
