"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hammer, Home, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type AccountType = "contractor" | "homeowner" | "employee";

export default function SignupPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("contractor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    if (accountType === "employee" && !inviteCode.trim()) {
      setError("An invite code from your employer is required.");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          account_type: accountType,
          business_name: accountType === "contractor" ? businessName : null,
          invite_code: accountType === "employee" ? inviteCode.trim() : null,
        },
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // For employees, redeem the invite code now that we have a session.
    if (accountType === "employee" && data.session) {
      const res = await fetch("/api/employee/redeem-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "Invite code couldn't be redeemed. Ask your employer for a new one.");
        setLoading(false);
        return;
      }
    }

    if (data.user && !data.session) {
      setInfo("Check your email to confirm your account, then log in.");
      setLoading(false);
      return;
    }
    const dest =
      accountType === "homeowner" ? "/home" :
      accountType === "employee"  ? "/work"  :
                                    "/dashboard";
    router.push(dest);
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center px-6 py-10">
      <div className="card w-full max-w-xl p-6">
        <Link href="/" className="text-sm text-slate-500">← Back</Link>
        <h1 className="mt-2 text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">Pick the option that fits you.</p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <TypeCard
            active={accountType === "contractor"}
            onClick={() => setAccountType("contractor")}
            icon={<Hammer className="h-5 w-5" />}
            title="Contractor"
            blurb="CRM, leads, AI proposals, team, marketplace claims"
          />
          <TypeCard
            active={accountType === "homeowner"}
            onClick={() => setAccountType("homeowner")}
            icon={<Home className="h-5 w-5" />}
            title="Homeowner"
            blurb="Get matched with vetted local pros"
          />
          <TypeCard
            active={accountType === "employee"}
            onClick={() => setAccountType("employee")}
            icon={<Wrench className="h-5 w-5" />}
            title="Employee"
            blurb="Clock in, see your schedule, finish tasks"
          />
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {accountType === "contractor" && (
            <div>
              <label className="label" htmlFor="business">Business name</label>
              <input id="business" className="input" placeholder="Smith Plumbing"
                value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
            </div>
          )}
          {accountType === "employee" && (
            <div>
              <label className="label" htmlFor="invite">Invite code from your employer</label>
              <input id="invite" className="input font-mono" placeholder="XXXX-XXXX-XXXX" required
                value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
              <p className="mt-1 text-xs text-slate-500">
                Your contractor generates this code under <em>Team → Invite an employee</em>.
              </p>
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" type="password" required minLength={8} className="input"
              autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {info && <p className="text-sm text-emerald-700">{info}</p>}
          <button className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600 text-center">
          Already have an account? <Link href="/login" className="text-brand-600 font-medium">Log in</Link>
        </p>
      </div>
    </main>
  );
}

function TypeCard({
  active, onClick, icon, title, blurb,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  blurb: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition",
        active
          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100 shadow-glow"
          : "border-slate-200 hover:bg-slate-50",
      )}
    >
      <span className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg text-white",
        active ? "bg-brand-gradient" : "bg-slate-300",
      )}>{icon}</span>
      <div className="mt-3 font-semibold">{title}</div>
      <div className="text-xs text-slate-500 mt-0.5">{blurb}</div>
    </button>
  );
}
