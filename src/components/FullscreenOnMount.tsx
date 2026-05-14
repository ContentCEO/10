"use client";

import { useEffect } from "react";

// Best-effort fullscreen on app boot.
//
// 1. Inside the Tauri desktop app: ask the native window to go fullscreen
//    via the Tauri JS API. Works regardless of what tauri.conf.json says.
//
// 2. In a regular browser: browsers only allow fullscreen after a user
//    gesture. We hook the first click/keypress and request fullscreen
//    once. Subsequent navigation doesn't re-trigger.
//
// Skips if the user has already explicitly exited fullscreen this tab
// (so they don't get fought with).

const SESSION_KEY = "cf:fs-armed";

interface TauriWindow {
  setFullscreen: (fullscreen: boolean) => Promise<void>;
}

interface TauriGlobal {
  window?: { getCurrent: () => TauriWindow };
}

function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__);
}

async function goFullscreen() {
  if (typeof window === "undefined") return;

  if (isTauri()) {
    try {
      const tauri = (window as unknown as { __TAURI__?: TauriGlobal }).__TAURI__;
      const win = tauri?.window?.getCurrent();
      if (win) await win.setFullscreen(true);
    } catch { /* ignore */ }
    return;
  }

  // Browser: requires user-gesture context.
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch { /* user denied or unsupported */ }
}

export function FullscreenOnMount() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Run once per browser session.
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;
    } catch { /* ignore */ }

    if (isTauri()) {
      // Desktop: do it immediately.
      goFullscreen();
      try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
      return;
    }

    // Browser: wait for first user gesture (browsers require this).
    function onGesture() {
      goFullscreen();
      try { window.sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
      cleanup();
    }
    function cleanup() {
      window.removeEventListener("click", onGesture);
      window.removeEventListener("keydown", onGesture);
    }
    window.addEventListener("click", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
    return cleanup;
  }, []);

  return null;
}
