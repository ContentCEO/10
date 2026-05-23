import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Coming soon — Contractor Flow Marketplace",
  description: "Free contractor quotes + lead marketplace launching soon.",
  robots: { index: false, follow: false },
};

export default function MarketplaceSoon() {
  return (
    <main className="min-h-screen grid place-items-center px-6 text-white" style={{ background: "#06060A" }}>
      <div className="max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-4"
             style={{ background: "linear-gradient(135deg, #818cf8, #6366f1, #A78BFA)" }}>
          <Sparkles className="h-6 w-6 text-white" />
        </div>
        <h1 className="font-serif text-4xl tracking-tight">Coming <em>soon</em>.</h1>
        <p className="mt-4 text-sm text-white/70">
          Contractor Flow Marketplace is launching at <strong>marketplace.contractorflowstore.com</strong>. Free quotes for MA homeowners + a lead engine for trade pros.
        </p>
        <Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-500 text-white font-semibold px-5 py-3 hover:bg-brand-400 transition">
          Back to Contractor Flow <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
