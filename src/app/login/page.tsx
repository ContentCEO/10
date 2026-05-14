"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const nextParam = search.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    let destination = nextParam ?? "";
    if (!destination) {
      const userId = data.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from("profiles").select("account_type").eq("id", userId).single();
        destination =
          profile?.account_type === "homeowner" ? "/home" :
          profile?.account_type === "employee"  ? "/work" :
                                                  "/dashboard";
      } else {
        destination = "/dashboard";
      }
    }

    // Short "welcome back" beat before navigating — feels premium.
    setWelcome(true);
    setTimeout(() => {
      router.push(destination);
      router.refresh();
    }, 750);
  }

  return (
    <>
      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div className="login-field" style={{ animationDelay: "650ms" }}>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required className="input" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="login-field" style={{ animationDelay: "780ms" }}>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required className="input" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="login-field text-sm text-red-600">{error}</p>}
        <div className="login-field" style={{ animationDelay: "900ms" }}>
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </button>
        </div>
      </form>

      {welcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ animation: "welcomePulse 750ms ease-out forwards" }}>
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient shadow-soft">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div className="mt-3 font-serif text-3xl tracking-tight" style={{ fontStyle: "italic" }}>
              Welcome back
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Letters({ text, delayStart = 0 }: { text: string; delayStart?: number }) {
  return (
    <>
      {[...text].map((ch, i) => (
        <span key={i} className="inline-block"
          style={{
            animation: `letterIn 700ms cubic-bezier(.2,.7,.2,1) ${delayStart + i * 28}ms backwards`,
            whiteSpace: "pre",
          }}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </>
  );
}

export default function LoginPage() {
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      setCursorPos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <main className="relative min-h-screen grid place-items-center px-6 overflow-hidden">
      {/* Aurora background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(900px 600px at ${cursorPos.x}% ${cursorPos.y}%, rgba(99,102,241,0.18), transparent 60%),
              radial-gradient(ellipse 70% 50% at 18% 8%, rgba(99,102,241,0.16), transparent 60%),
              radial-gradient(ellipse 60% 45% at 82% 28%, rgba(139,92,246,0.14), transparent 60%),
              radial-gradient(ellipse 70% 50% at 50% 92%, rgba(236,72,153,0.10), transparent 60%)
            `,
            transition: "background 600ms ease-out",
          }} />
        <div className="absolute inset-0 opacity-[0.10]" style={{
          backgroundImage: `
            linear-gradient(rgba(99,102,241,0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,0.6) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 60% 50% at center, black 0%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at center, black 0%, transparent 80%)",
          animation: "gridDrift 40s linear infinite",
        }} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes letterIn { from { opacity: 0; transform: translateY(0.5em); } to { opacity: 1; transform: translateY(0); } }
        @keyframes loginFieldIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes brandIn { from { opacity: 0; transform: scale(0.6) rotate(-15deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
        @keyframes glowPulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
        @keyframes welcomePulse { 0% { opacity: 0; transform: scale(0.85); } 30% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.05); } }
        @keyframes gridDrift { 0% { background-position: 0 0; } 100% { background-position: 64px 64px; } }
        .login-field { animation: loginFieldIn 700ms cubic-bezier(.2,.7,.2,1) backwards; }
      ` }} />

      <div className="card w-full max-w-md p-8 relative overflow-hidden"
        style={{ animation: "loginFieldIn 800ms cubic-bezier(.2,.7,.2,1)" }}>
        {/* Brand-gradient glow behind card */}
        <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(99,102,241,0.35) 0%, transparent 60%)",
            filter: "blur(40px)",
            animation: "glowPulse 4s ease-in-out infinite",
          }} />

        <div className="relative">
          <Link href="/" className="text-xs text-ink-500 hover:text-brand-600 inline-flex items-center gap-1"
                style={{ animation: "loginFieldIn 500ms ease-out backwards" }}>
            ← Back
          </Link>

          <div className="mt-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient shadow-soft"
               style={{ animation: "brandIn 800ms cubic-bezier(.2,1.4,.4,1) 100ms backwards" }}>
            <Sparkles className="h-6 w-6 text-white" />
          </div>

          <h1 className="mt-4 display-h2" style={{ fontSize: "1.875rem" }}>
            <Letters text="Welcome to " delayStart={300} />
            <span style={{ fontStyle: "italic", color: "rgb(99 102 241)" }}>
              <Letters text="ContractorFlow" delayStart={300 + 11 * 28} />
            </span>
          </h1>
          <p className="mt-2 text-sm text-ink-500"
             style={{ animation: "loginFieldIn 600ms ease-out 550ms backwards" }}>
            Log in to keep building.
          </p>

          <Suspense fallback={<div className="mt-6 h-40" />}>
            <LoginForm />
          </Suspense>

          <p className="mt-6 text-sm text-ink-600 text-center"
             style={{ animation: "loginFieldIn 600ms ease-out 1050ms backwards" }}>
            New here? <Link href="/signup" className="text-brand-600 font-medium">Create an account</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
