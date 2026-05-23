// Public landing-page layout for auto-generated prospect sites.
// Deliberately bare — no app chrome, no auth, no shared nav.

import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false }, // don't index per-prospect previews
};

export default function SitesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="generated-site" className="min-h-screen bg-white text-slate-900 antialiased">
      {children}
    </div>
  );
}
