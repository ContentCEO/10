"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity, Bot, CreditCard, Database, MessageSquare, Search, Server } from "lucide-react";

/*
 * Plan 1 / Section B / Idea #16 — Top-bar system health badges.
 *
 * Thin sticky top bar that sits above page content on every (app) route.
 * Shows 5-6 small status pills indicating which external systems are
 * configured + healthy. Green dot = OK, gray = not configured. Updates
 * every 60s.
 *
 * On the right: a placeholder global-search hint (Cmd+K).
 */

interface Services {
  db: boolean;
  stripe: boolean;
  twilio: boolean;
  ai: boolean;
  cron: boolean;
  serpapi: boolean;
}

const PILLS: { key: keyof Services; label: string; icon: typeof Activity }[] = [
  { key: "db",      label: "DB",     icon: Database },
  { key: "ai",      label: "AI",     icon: Bot },
  { key: "stripe",  label: "Stripe", icon: CreditCard },
  { key: "twilio",  label: "SMS",    icon: MessageSquare },
  { key: "cron",    label: "Cron",   icon: Activity },
  { key: "serpapi", label: "Search", icon: Server },
];

export function AppTopBar() {
  const [services, setServices] = useState<Services | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/health/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { services?: Services };
      if (data.services) setServices(data.services);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 60_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const upCount = services ? Object.values(services).filter(Boolean).length : 0;
  const totalCount = services ? Object.values(services).length : 0;

  return (
    <header className="sticky top-0 z-30 bg-[#0b0b14]/85 backdrop-blur border-b border-white/5">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          <span className="text-[10px] uppercase tracking-wider font-mono text-white/40 shrink-0 pr-1">
            {services ? `${upCount}/${totalCount} systems` : "loading"}
          </span>
          {PILLS.map(({ key, label, icon: Icon }) => {
            const ok = services?.[key] ?? false;
            return (
              <span
                key={key}
                title={ok ? `${label} configured` : `${label} not configured`}
                className={
                  ok
                    ? "inline-flex items-center gap-1 rounded-full bg-emerald-500/15 ring-1 ring-emerald-400/30 text-emerald-300 px-2 py-0.5 text-[10px] font-medium shrink-0"
                    : "inline-flex items-center gap-1 rounded-full bg-white/[0.04] ring-1 ring-white/10 text-white/40 px-2 py-0.5 text-[10px] font-medium shrink-0"
                }
              >
                <span className={ok ? "h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse-soft" : "h-1.5 w-1.5 rounded-full bg-white/30"} />
                <Icon className="h-3 w-3" />
                {label}
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-white/40 font-mono">
            <Search className="h-3 w-3" />
            <kbd className="px-1 py-0.5 rounded bg-white/5 ring-1 ring-white/10 text-white/70">?</kbd>
            <span>for shortcuts</span>
          </span>
        </div>
      </div>
    </header>
  );
}
