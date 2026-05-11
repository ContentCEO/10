"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const nextParam = search.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
    router.push(destination);
    router.refresh();
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" required className="input" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" required className="input" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen grid place-items-center px-6">
      <div className="card w-full max-w-md p-6">
        <Link href="/" className="text-sm text-slate-500">← Back</Link>
        <h1 className="mt-2 text-2xl font-bold">Log in to ContractorFlow</h1>
        <Suspense fallback={<div className="mt-6 h-40" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-4 text-sm text-slate-600 text-center">
          New here? <Link href="/signup" className="text-brand-600 font-medium">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
