import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, CheckCircle2, Store } from "lucide-react";
import { signupAction } from "./actions";

export const metadata: Metadata = {
  title: "Sign up · Marketplace",
};

const EMERALD = "#10b981";

export default function SignupPage({ searchParams }: { searchParams: { error?: string; plan?: string } }) {
  const error = searchParams.error;
  const plan  = searchParams.plan;

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
          Get early access.
        </h1>
        <p className="mt-3 text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
          7-day free trial · No credit card required to sign up · Cancel anytime.
        </p>

        <ul className="mt-6 space-y-1.5 text-sm">
          {[
            "Exclusive MA homeowner leads",
            "SMS + email alerts the moment leads land",
            "Pause notifications anytime",
            "Founding-member pricing locked for first 50",
          ].map((b) => (
            <li key={b} className="flex items-center gap-2" style={{ color: "rgba(255,255,255,0.75)" }}>
              <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: EMERALD }} />
              {b}
            </li>
          ))}
        </ul>

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

        <form action={signupAction} className="mt-7 space-y-4">
          {plan && <input type="hidden" name="plan" value={plan} />}
          <label className="block">
            <span className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>Business name</span>
            <input type="text" name="business_name" required
              placeholder="Joe's Roofing LLC"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff" }} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>Email</span>
            <input type="email" name="email" required autoComplete="email"
              placeholder="you@yourbusiness.com"
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.14)", color: "#fff" }} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>Password</span>
            <input type="password" name="password" required autoComplete="new-password" minLength={8}
              placeholder="At least 8 characters"
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
            Create account <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 text-center text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold" style={{ color: EMERALD }}>
            Sign in
          </Link>
        </div>

        <p className="mt-8 text-[11px] text-center" style={{ color: "rgba(255,255,255,0.40)" }}>
          By signing up you agree to our{" "}
          <Link href="https://contractorflowstore.com/terms" className="underline">Terms</Link> and{" "}
          <Link href="https://contractorflowstore.com/privacy" className="underline">Privacy</Link>.
        </p>
      </div>
    </main>
  );
}
