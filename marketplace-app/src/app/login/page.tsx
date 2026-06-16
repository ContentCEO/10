import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Store } from "lucide-react";
import { loginAction } from "./actions";

export const metadata: Metadata = {
  title: "Sign in · Marketplace",
};

const EMERALD = "#10b981";

export default function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  const next  = searchParams.next  ?? "/dashboard";
  const error = searchParams.error;

  return (
    <main className="min-h-screen text-white" style={{ background: "#06060A" }}>
      <div className="absolute inset-0 pointer-events-none -z-10"
        style={{
          backgroundImage:
            `radial-gradient(900px 500px at 80% -10%, ${EMERALD}33, transparent 60%),` +
            `radial-gradient(700px 400px at -10% 10%, ${EMERALD}22, transparent 60%)`,
        }} />

      <div className="max-w-md mx-auto px-6 py-16">
        <Link href="https://contractorflowstore.com" className="inline-flex items-center gap-1.5 text-sm hover:text-white mb-10"
          style={{ color: "rgba(255,255,255,0.55)" }}>
          <ArrowLeft className="h-4 w-4" /> contractorflowstore.com
        </Link>

        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-mono mb-3"
          style={{ color: "#6ee7b7" }}>
          <Store className="h-3 w-3" /> Marketplace
        </div>
        <h1 style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: 56, lineHeight: 1, letterSpacing: "-0.025em" }}>
          Welcome back.
        </h1>
        <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          Sign in to check your leads, claim new ones, and manage your subscription.
        </p>

        {error && (
          <div className="mt-6 p-3 rounded-xl text-sm"
            style={{
              background: "rgba(244, 63, 94, 0.10)",
              border: "1px solid rgba(244, 63, 94, 0.32)",
              color: "#fda4af",
            }}>
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={loginAction} className="mt-7 space-y-4">
          <input type="hidden" name="next" value={next} />
          <label className="block">
            <span className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>Email</span>
            <input type="email" name="email" required autoComplete="email"
              placeholder="you@yourbusiness.com"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff" }} />
          </label>
          <label className="block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.65)" }}>Password</span>
              <Link href="/auth/reset" className="text-xs" style={{ color: EMERALD }}>Forgot?</Link>
            </div>
            <input type="password" name="password" required autoComplete="current-password" minLength={8}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff" }} />
          </label>

          <button type="submit"
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all hover:scale-[1.02]"
            style={{
              background: `linear-gradient(135deg, ${EMERALD}, #059669)`,
              color: "#fff",
              boxShadow: `0 10px 22px -8px ${EMERALD}88`,
            }}>
            Sign in <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
          New here?{" "}
          <Link href="/signup" className="font-semibold" style={{ color: EMERALD }}>
            Create an account
          </Link>
        </div>
      </div>
    </main>
  );
}
