"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

/*
 * Plan 1 / Section F / Idea #8 — Global toast notifications.
 *
 * Usage anywhere (client or server-action-result):
 *   toast({ message: "Saved!", type: "success" });
 *   toast({ message: "Failed.", type: "error", duration: 6000 });
 *
 * Mount <Toaster /> once near the root of the (app) layout.
 *
 * Implementation: window CustomEvent bus, no React context needed.
 * Works across components without prop-drilling, and from anywhere
 * including non-React code (e.g., a fetch error handler).
 */

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastInput {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface Toast extends Required<Omit<ToastInput, "duration">> {
  id: string;
  duration: number;
}

const EVENT = "cf:toast";

export function toast(input: ToastInput) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: input }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<ToastInput>).detail;
      if (!detail?.message) return;
      const t: Toast = {
        id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        message: detail.message,
        type: detail.type ?? "info",
        duration: detail.duration ?? 4500,
      };
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, t.duration);
    }
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  function dismiss(id: string) {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div aria-live="polite" className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2 max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const icon =
          t.type === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> :
          t.type === "error"   ? <XCircle      className="h-4 w-4 text-rose-300" /> :
          t.type === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-300" /> :
                                  <Info         className="h-4 w-4 text-brand-300" />;
        const ring =
          t.type === "success" ? "ring-emerald-400/30" :
          t.type === "error"   ? "ring-rose-400/30"    :
          t.type === "warning" ? "ring-amber-400/30"   :
                                  "ring-brand-400/30";
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl bg-ink-900/95 backdrop-blur text-white text-sm shadow-soft-lg ring-1 ${ring} animate-fade-up`}
            style={{ animationDelay: "0ms" }}
          >
            {icon}
            <div className="flex-1 min-w-0">{t.message}</div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-white/40 hover:text-white shrink-0"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
