"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) return setError(error.message);
    if (data.session) {
      router.replace("/dashboard/profile");
      router.refresh();
    } else {
      setDone(true);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-lg font-semibold mb-6">
          <span className="text-brand-600">●</span> LocalContent AI
        </Link>
        <div className="card">
          <h1 className="text-xl font-semibold">Create your account</h1>
          {done ? (
            <p className="mt-4 text-sm text-slate-600">
              Check your inbox to verify your email, then sign in.
            </p>
          ) : (
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="email">Work email</label>
                <input id="email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input id="password" type="password" required minLength={8} value={password}
                  onChange={(e) => setPassword(e.target.value)} className="input" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button className="btn-primary w-full" disabled={loading}>
                {loading ? "Creating…" : "Create account"}
              </button>
            </form>
          )}
          <p className="mt-4 text-sm text-slate-600 text-center">
            Already have one? <Link href="/login" className="text-brand-600 font-medium">Log in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
