"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Forces the PIN lock screen every time the desktop app launches.
//
// Behavior:
//   - Only kicks in when running inside Tauri (detected via __TAURI__ or UA).
//   - Only when a PIN record exists in localStorage (else first-time user
//     goes through the normal login flow).
//   - Only once per browser session — after the user unlocks (the
//     login page sets this flag), they can navigate freely until they
//     close + reopen the app.
//
// Web browsers are unaffected — sessions persist normally there.

const UNLOCKED_KEY = "cf:unlocked-this-session";
const REMEMBER_KEY = "cf:remember";

function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  if ((window as unknown as { __TAURI__?: unknown }).__TAURI__) return true;
  const ua = navigator.userAgent ?? "";
  return ua.includes("Tauri") || ua.includes("ContractorFlow/");
}

function hasRememberRecord(): boolean {
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { pinHash?: string };
    return Boolean(parsed.pinHash);
  } catch { return false; }
}

export function DesktopLockGate() {
  const router = useRouter();

  useEffect(() => {
    if (!isTauri()) return;
    try {
      if (window.sessionStorage.getItem(UNLOCKED_KEY) === "1") return;
    } catch { /* ignore */ }
    if (!hasRememberRecord()) return;

    // Bounce to /login. The login page sees the active session + PIN
    // record → shows the PIN keypad. User enters PIN → onUnlock sets
    // the sessionStorage flag → goes to dashboard.
    router.replace("/login");
  }, [router]);

  return null;
}
