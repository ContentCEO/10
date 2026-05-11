"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Hammer, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

type AccountType = "contractor" | "homeowner";

export default function SignupPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<AccountType>("contractor");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          account_type: accountType,
          business_name: accountType === "contractor" ? businessName : null,
        },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.user && !data.session) {
      setInfo("Check your email to confirm your account, then log in.");
      setLoading(false);
      return;
    }
    router.push(accountType === "homeowner" ? "/home" : "/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen grid place-items-center px-6 py-10">
      <div className="card w-full max-w-md p-6">
        <Link href="/" className="text-sm text-slate-500">← Back</Link>
        <h1 className="mt-2 text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">Pick the option that fits you.</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <TypeCard
            active={accountType === "contractor"}
            onClick={() => setAccountType("contractor")}
            icon={<Hammer className="h-5 w-5" />}
            title="Contractor"
            blurb="CRM, leads, AI proposals, marketplace claims"
          />
          <TypeCard
            active={accountType === "homeowner"}
            onClick={() => setAccountType("homeowner")}
            icon={<Home className="h-5 w-5" />}
            title="Homeowner"
            blurb="Get matched with vetted local pros"
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
            {loading
              ? "Creating account…"
              : accountType === "contractor"
                ? "Start 14-day free trial"
                : "Create account"}
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
