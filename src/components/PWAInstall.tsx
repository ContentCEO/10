"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "cf-pwa-dismissed-at";
const DISMISS_DAYS = 14;

export function PWAInstall() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Hide on iOS standalone or installed PWA.
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) { setInstalled(true); return; }

    const ts = Number(localStorage.getItem(DISMISS_KEY) ?? "0");
    if (ts && Date.now() - ts < DISMISS_DAYS * 86_400_000) {
      setDismissed(true);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (installed || dismissed || !deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-fade-up">
      <div className="card shadow-soft-lg p-4 flex items-start gap-3 border-brand-200/60">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow shrink-0">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold tracking-tight">Install ContractorFlow</div>
          <p className="mt-0.5 text-xs text-ink-600 leading-relaxed">
            Get the desktop app — opens in its own window, works offline, push alerts.
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={install} className="btn-primary !py-1.5 !px-3 text-xs">
              Install app
            </button>
            <button onClick={dismiss} className="btn-ghost !py-1.5 !px-3 text-xs">
              Not now
            </button>
          </div>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-ink-400 hover:text-ink-700 transition shrink-0"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
