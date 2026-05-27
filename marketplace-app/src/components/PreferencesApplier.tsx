"use client";

import { useEffect } from "react";

/*
 * Plan 1 / F-12 — Apply user preferences to <html>.
 *
 * Reads the user's preferences once at mount and applies:
 *   - data-contrast="high" if high_contrast preference is set
 *   - data-theme="dark"|"light"|"system" for theme override
 *   - data-density="compact"|"comfortable"
 *
 * Mounted once at the top of (app)/layout. Pulls preferences via fetch
 * so a server roundtrip isn't required at every page.
 */

export function PreferencesApplier() {
  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch("/api/preferences", { cache: "no-store" });
        if (!res.ok || aborted) return;
        const data = await res.json() as {
          preferences?: {
            theme?: string; density?: string;
            high_contrast?: boolean; sidebar_collapsed_default?: boolean;
          };
        };
        const p = data.preferences ?? {};
        const html = document.documentElement;
        if (p.theme)             html.setAttribute("data-theme", p.theme);
        if (p.density)           html.setAttribute("data-density", p.density);
        if (p.high_contrast)     html.setAttribute("data-contrast", "high");
        else                     html.removeAttribute("data-contrast");
      } catch { /* */ }
    })();
    return () => { aborted = true; };
  }, []);

  return null;
}
