"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Hammer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, company_name: companyName } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
    } else {
      setInfo("Check your email to confirm your account, then log in.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-brand-50/40">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2 font-semibold text-gray-900">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            <Hammer size={18} />
          </span>
          ProposalPro <span className="text-brand-600">AI</span>
        </Link>
        <div className="card p-8">
          <h1 className="text-2xl font-semibold text-gray-900">Create your account</h1>
          <p className="mt-1 text-sm text-gray-600">Start your 14-day Pro trial — no credit card.</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label" htmlFor="fullName">Full name</label>
              <input id="fullName" required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="companyName">Company name</label>
              <input id="companyName" className="input" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" required className="input"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="new-password" required minLength={8} className="input"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {info && <p className="text-sm text-green-700">{info}</p>}
            <button className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-600">
            Already a member? <Link href="/login" className="font-medium text-brand-600 hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
