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
    <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-ink-200/70">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          <span className="text-[10px] uppercase tracking-wider font-mono text-ink-400 shrink-0 pr-1">
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
                    ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 px-2 py-0.5 text-[10px] font-medium shrink-0"
                    : "inline-flex items-center gap-1 rounded-full bg-ink-100 ring-1 ring-ink-200 text-ink-500 px-2 py-0.5 text-[10px] font-medium shrink-0"
                }
              >
                <span className={ok ? "h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse-soft" : "h-1.5 w-1.5 rounded-full bg-ink-300"} />
                <Icon className="h-3 w-3" />
                {label}
              </span>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-ink-400 font-mono">
            <Search className="h-3 w-3" />
            <kbd className="px-1 py-0.5 rounded bg-ink-100 ring-1 ring-ink-200 text-ink-600">?</kbd>
            <span>for shortcuts</span>
          </span>
        </div>
      </div>
    </header>
  );
}
