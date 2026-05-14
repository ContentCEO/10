"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const P = {
  bg:       "#06060A",
  card:     "#11111A",
  border:   "rgba(255,255,255,0.07)",
  borderHi: "rgba(255,255,255,0.14)",
  text:     "#FAFAFA",
  muted:    "#A1A1AA",
  subtle:   "#71717A",
  indigo:   "#6366f1",
  indigoHi: "#818cf8",
  violet:   "#A78BFA",
  pink:     "#F472B6",
};

const SANS  = "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif";
const SERIF = "var(--font-instrument-serif), \"Times New Roman\", serif";

const REMEMBER_KEY = "cf:remember";
interface RememberRecord {
  email: string;
  name: string | null;
  pinHash: string;
  setAt: number;
}

async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode("cf-pin-v1:" + pin);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readRemember(): RememberRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(REMEMBER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberRecord;
    if (!parsed.email || !parsed.pinHash) return null;
    return parsed;
  } catch { return null; }
}

function clearRemember() {
  try { window.localStorage.removeItem(REMEMBER_KEY); } catch { /* ignore */ }
}

function destinationFor(accountType: string | null | undefined): string {
  return accountType === "homeowner" ? "/home"
       : accountType === "employee"  ? "/work"
       :                               "/dashboard";
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

/* ─── PIN-based welcome-back flow ─────────────────────────────── */
function PinUnlock({ record, onUnlock, onForget }: {
  record: RememberRecord;
  onUnlock: () => void;
  onForget: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function verify(p: string) {
    const hash = await hashPin(p);
    if (hash === record.pinHash) {
      onUnlock();
    } else {
      setError("Wrong PIN");
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 400);
    }
  }

  function onChange(v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 4);
    setPin(clean);
    setError(null);
    if (clean.length === 4) verify(clean);
  }

  const firstName = record.name?.split(" ")[0] ?? "back";

  return (
    <div className="text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
           style={{
             background: `linear-gradient(135deg, ${P.indigoHi}, ${P.indigo}, ${P.violet})`,
             boxShadow: `0 12px 30px -8px ${P.indigo}99, inset 0 1px 0 ${P.indigoHi}`,
             animation: "brandIn 800ms cubic-bezier(.2,1.4,.4,1) backwards",
           }}>
        <Sparkles className="h-7 w-7 text-white" />
      </div>

      <h1 style={{ fontFamily: SERIF, fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 400,
                   letterSpacing: "-0.02em", lineHeight: 1.05, color: P.text }}>
        <Letters text="Welcome back, " delayStart={150} />
        <span style={{ fontStyle: "italic",
          backgroundImage: `linear-gradient(135deg, ${P.indigoHi}, ${P.violet}, ${P.pink})`,
          WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
          color: "transparent",
        }}>
          <Letters text={firstName} delayStart={150 + 14 * 28} />
        </span>
      </h1>
      <p className="mt-3 text-sm" style={{ color: P.muted, fontFamily: SANS,
            animation: "loginFieldIn 600ms ease-out 700ms backwards" }}>
        Enter your 4-digit PIN to unlock.
      </p>

      <div className={`mt-6 flex items-center justify-center gap-2 ${shake ? "animate-shake" : ""}`}
           style={{ animation: "loginFieldIn 600ms ease-out 800ms backwards" }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-mono tabular-nums"
            style={{
              background: P.card,
              border: `1px solid ${i < pin.length ? P.indigoHi : P.border}`,
              color: P.text,
              transition: "border-color 200ms",
            }}>
            {pin[i] ? "●" : ""}
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={pin}
        onChange={(e) => onChange(e.target.value)}
        className="absolute opacity-0 pointer-events-none w-px h-px"
        aria-label="PIN"
      />

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      <button
        type="button"
        onClick={onForget}
        className="mt-6 text-xs hover:underline"
        style={{ color: P.subtle, fontFamily: SANS,
                 animation: "loginFieldIn 600ms ease-out 1100ms backwards" }}>
        Not you? Sign in with a different account
      </button>
    </div>
  );
}

/* ─── PIN setup after first login ─────────────────────────────── */
function PinSetup({ email, name, onDone }: {
  email: string;
  name: string | null;
  onDone: () => void;
}) {
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [step, setStep] = useState<"set" | "confirm">("set");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, [step]);

  async function save() {
    const hash = await hashPin(pin);
    const rec: RememberRecord = { email, name, pinHash: hash, setAt: Date.now() };
    try { window.localStorage.setItem(REMEMBER_KEY, JSON.stringify(rec)); } catch { /* ignore */ }
    onDone();
  }

  function onPinChange(v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 4);
    if (step === "set") {
      setPin(clean);
      setError(null);
      if (clean.length === 4) setTimeout(() => setStep("confirm"), 200);
    } else {
      setConfirm(clean);
      setError(null);
      if (clean.length === 4) {
        if (clean === pin) save();
        else { setError("PINs don't match"); setConfirm(""); setStep("set"); setPin(""); }
      }
    }
  }

  const value = step === "set" ? pin : confirm;

  return (
    <div className="text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl mb-4"
           style={{
             background: `linear-gradient(135deg, ${P.indigoHi}, ${P.indigo}, ${P.violet})`,
             boxShadow: `0 12px 30px -8px ${P.indigo}99`,
           }}>
        <Sparkles className="h-7 w-7 text-white" />
      </div>

      <h1 style={{ fontFamily: SERIF, fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 400,
                   letterSpacing: "-0.02em", lineHeight: 1.1, color: P.text }}>
        {step === "set" ? "Set a 4-digit PIN" : "Confirm your PIN"}
      </h1>
      <p className="mt-2 text-sm" style={{ color: P.muted, fontFamily: SANS }}>
        Next time you open the app, use this PIN instead of your password.
      </p>

      <div className="mt-6 flex items-center justify-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="w-12 h-14 rounded-xl flex items-center justify-center text-2xl font-mono"
            style={{
              background: P.card,
              border: `1px solid ${i < value.length ? P.indigoHi : P.border}`,
              color: P.text,
            }}>
            {value[i] ? "●" : ""}
          </div>
        ))}
      </div>
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        value={value}
        onChange={(e) => onPinChange(e.target.value)}
        className="absolute opacity-0 pointer-events-none w-px h-px"
        aria-label="PIN"
      />

      {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}

      <button onClick={onDone} className="mt-6 text-xs hover:underline"
              style={{ color: P.subtle, fontFamily: SANS }}>
        Skip for now
      </button>
    </div>
  );
}

/* ─── Main login form ─────────────────────────────────────────── */
function LoginForm({ onSuccess }: { onSuccess: (email: string, name: string | null, accountType: string | null) => void }) {
  const search = useSearchParams();
  void search;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    const userId = data.user?.id;
    let name: string | null = null;
    let accountType: string | null = null;
    if (userId) {
      const { data: profile } = await supabase
        .from("profiles").select("full_name,business_name,account_type")
        .eq("id", userId).single();
      name = (profile as { full_name?: string | null; business_name?: string | null } | null)?.full_name
          ?? (profile as { business_name?: string | null } | null)?.business_name
          ?? null;
      accountType = (profile as { account_type?: string | null } | null)?.account_type ?? null;
    }
    onSuccess(email, name, accountType);
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="login-field" style={{ animationDelay: "650ms" }}>
        <label htmlFor="email" className="block text-xs font-semibold mb-1.5"
               style={{ color: P.muted, fontFamily: SANS, letterSpacing: "0.04em" }}>
          EMAIL
        </label>
        <input id="email" type="email" required autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: P.card, color: P.text,
            border: `1px solid ${P.border}`,
            fontFamily: SANS,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = P.indigoHi; e.currentTarget.style.boxShadow = `0 0 0 3px ${P.indigo}33`; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.boxShadow = "none"; }} />
      </div>
      <div className="login-field" style={{ animationDelay: "780ms" }}>
        <label htmlFor="password" className="block text-xs font-semibold mb-1.5"
               style={{ color: P.muted, fontFamily: SANS, letterSpacing: "0.04em" }}>
          PASSWORD
        </label>
        <input id="password" type="password" required autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: P.card, color: P.text,
            border: `1px solid ${P.border}`,
            fontFamily: SANS,
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = P.indigoHi; e.currentTarget.style.boxShadow = `0 0 0 3px ${P.indigo}33`; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.boxShadow = "none"; }} />
      </div>

      {error && (
        <p className="login-field text-sm text-rose-400" style={{ fontFamily: SANS }}>{error}</p>
      )}

      <div className="login-field" style={{ animationDelay: "900ms" }}>
        <button type="submit" disabled={loading}
          className="relative w-full px-4 py-2.5 rounded-xl text-sm font-semibold overflow-hidden group disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${P.indigoHi}, ${P.indigo}, ${P.violet})`,
            color: "#fff", fontFamily: SANS,
            boxShadow: `0 14px 30px -10px ${P.indigo}aa, inset 0 1px 0 rgba(255,255,255,0.25)`,
          }}>
          <span className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)",
                  animation: "shimmer 1.6s linear infinite",
                }} />
          <span className="relative inline-flex items-center justify-center gap-1.5">
            {loading ? "Logging in…" : <>Log in <ArrowRight className="h-4 w-4" /></>}
          </span>
        </button>
      </div>
    </form>
  );
}

function LoginInner() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [stage, setStage] = useState<"loading" | "pin" | "form" | "setup" | "welcome">("loading");
  const [record, setRecord] = useState<RememberRecord | null>(null);
  const [emailJustLoggedIn, setEmailJustLoggedIn] = useState<{ email: string; name: string | null; accountType: string | null } | null>(null);
  const [cursor, setCursor] = useState({ x: 50, y: 50 });

  // On mount: check if we have a remembered user AND an active session.
  useEffect(() => {
    setMounted(true);
    const rec = readRemember();
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (rec && data.session) {
        setRecord(rec);
        setStage("pin");
      } else {
        setStage("form");
      }
    });
  }, []);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      setCursor({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 });
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  function destination(): string {
    const t = emailJustLoggedIn?.accountType ?? null;
    return destinationFor(t);
  }

  function go() {
    setStage("welcome");
    setTimeout(() => {
      router.push(destination());
      router.refresh();
    }, 700);
  }

  return (
    <main className="relative min-h-screen overflow-hidden grid place-items-center px-6"
          style={{ background: P.bg, color: P.text, fontFamily: SANS }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes letterIn { from { opacity: 0; transform: translateY(0.5em); } to { opacity: 1; transform: translateY(0); } }
        @keyframes loginFieldIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes brandIn { from { opacity: 0; transform: scale(0.55) rotate(-18deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
        @keyframes glowPulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes welcomePulse { 0% { opacity: 0; transform: scale(0.85); } 30% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(1.05); } }
        @keyframes gridDrift { 0% { background-position: 0 0; } 100% { background-position: 64px 64px; } }
        @keyframes auroraShift { 0% { transform: translate(0,0) scale(1); opacity: 0.85; } 50% { transform: translate(2%,-1%) scale(1.05); opacity: 1; } 100% { transform: translate(-1%,1%) scale(1); opacity: 0.85; } }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        .login-field { animation: loginFieldIn 700ms cubic-bezier(.2,.7,.2,1) backwards; }
        .animate-shake { animation: shake 400ms ease-out; }
      ` }} />

      {/* Aurora background — follows cursor */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0"
          style={{
            background: `
              radial-gradient(900px 600px at ${cursor.x}% ${cursor.y}%, ${P.indigo}40, transparent 60%),
              radial-gradient(ellipse 70% 50% at 18% 8%, ${P.indigo}33, transparent 60%),
              radial-gradient(ellipse 60% 45% at 82% 28%, ${P.violet}26, transparent 60%),
              radial-gradient(ellipse 70% 50% at 50% 92%, ${P.pink}1a, transparent 60%)
            `,
            transition: "background 700ms ease-out",
            animation: "auroraShift 22s ease-in-out infinite alternate",
          }} />
        <div className="absolute inset-0 opacity-[0.12]" style={{
          backgroundImage: `
            linear-gradient(rgba(129,140,248,0.55) 1px, transparent 1px),
            linear-gradient(90deg, rgba(129,140,248,0.55) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 60% 50% at center, black 0%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 60% 50% at center, black 0%, transparent 80%)",
          animation: "gridDrift 40s linear infinite",
        }} />
      </div>

      {!mounted ? null : (
        <div className="relative w-full max-w-md p-8 rounded-3xl overflow-hidden"
             style={{
               background: "rgba(11,11,22,0.85)",
               backdropFilter: "blur(18px)",
               border: `1px solid ${P.border}`,
               boxShadow: `0 40px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px ${P.border}, inset 0 1px 0 ${P.borderHi}`,
               animation: "loginFieldIn 800ms cubic-bezier(.2,.7,.2,1)",
             }}>
          <div className="absolute -top-32 -right-32 h-72 w-72 rounded-full pointer-events-none"
               style={{
                 background: `radial-gradient(circle, ${P.indigo}55 0%, transparent 60%)`,
                 filter: "blur(36px)",
                 animation: "glowPulse 5s ease-in-out infinite",
               }} />
          <div className="absolute -bottom-32 -left-32 h-72 w-72 rounded-full pointer-events-none"
               style={{
                 background: `radial-gradient(circle, ${P.violet}44 0%, transparent 60%)`,
                 filter: "blur(36px)",
                 animation: "glowPulse 6s ease-in-out infinite",
               }} />

          <div className="relative">
            {stage === "form" && (
              <>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl mb-5"
                     style={{
                       background: `linear-gradient(135deg, ${P.indigoHi}, ${P.indigo}, ${P.violet})`,
                       boxShadow: `0 12px 28px -8px ${P.indigo}aa`,
                       animation: "brandIn 800ms cubic-bezier(.2,1.4,.4,1) 100ms backwards",
                     }}>
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <h1 style={{ fontFamily: SERIF, fontSize: "clamp(28px, 4.5vw, 38px)",
                             fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.1, color: P.text }}>
                  <Letters text="Welcome to " delayStart={250} />
                  <span style={{ fontStyle: "italic",
                    backgroundImage: `linear-gradient(135deg, ${P.indigoHi}, ${P.violet}, ${P.pink})`,
                    WebkitBackgroundClip: "text", backgroundClip: "text",
                    WebkitTextFillColor: "transparent", color: "transparent",
                  }}>
                    <Letters text="ContractorFlow" delayStart={250 + 11 * 28} />
                  </span>
                </h1>
                <p className="mt-2 text-sm" style={{ color: P.muted,
                     animation: "loginFieldIn 600ms ease-out 550ms backwards" }}>
                  Log in to keep building.
                </p>
                <div className="mt-6">
                  <LoginForm onSuccess={(email, name, accountType) => {
                    setEmailJustLoggedIn({ email, name, accountType });
                    // Always offer to set a PIN after first login.
                    setStage("setup");
                  }} />
                </div>
                <p className="mt-6 text-sm text-center" style={{ color: P.muted,
                   animation: "loginFieldIn 600ms ease-out 1050ms backwards" }}>
                  New here?{" "}
                  <Link href="/signup" style={{ color: P.indigoHi, fontWeight: 600 }}>
                    Create an account
                  </Link>
                </p>
                <p className="mt-2 text-center"
                   style={{ animation: "loginFieldIn 600ms ease-out 1150ms backwards" }}>
                  <Link href="/" className="text-xs hover:underline" style={{ color: P.subtle }}>
                    ← Back to site
                  </Link>
                </p>
              </>
            )}

            {stage === "pin" && record && (
              <PinUnlock
                record={record}
                onUnlock={() => {
                  setEmailJustLoggedIn({ email: record.email, name: record.name, accountType: null });
                  // No account type from PIN flow — default to dashboard.
                  go();
                }}
                onForget={() => {
                  clearRemember();
                  setRecord(null);
                  setStage("form");
                }}
              />
            )}

            {stage === "setup" && emailJustLoggedIn && (
              <PinSetup
                email={emailJustLoggedIn.email}
                name={emailJustLoggedIn.name}
                onDone={go}
              />
            )}

            {stage === "welcome" && (
              <div className="text-center py-8"
                   style={{ animation: "welcomePulse 700ms ease-out forwards" }}>
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
                     style={{
                       background: `linear-gradient(135deg, ${P.indigoHi}, ${P.indigo}, ${P.violet})`,
                       boxShadow: `0 16px 40px -8px ${P.indigo}aa`,
                     }}>
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div style={{ fontFamily: SERIF, fontSize: "2rem", fontStyle: "italic",
                              color: P.text, letterSpacing: "-0.02em" }}>
                  Welcome back
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
