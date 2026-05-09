"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setInfo(null);
        setLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, company },
            emailRedirectTo:
              typeof window !== "undefined"
                ? `${window.location.origin}/dashboard`
                : undefined,
          },
        });
        setLoading(false);
        if (error) {
          setError(error.message);
          return;
        }
        if (data.session) {
          router.replace("/dashboard");
          router.refresh();
        } else {
          setInfo(
            "Check your inbox for a confirmation link to activate your account.",
          );
        }
      }}
    >
      <div>
        <label htmlFor="fullName" className="label">
          Your name
        </label>
        <input
          id="fullName"
          required
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="company" className="label">
          Company
        </label>
        <input
          id="company"
          className="input"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="email" className="label">
          Work email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {info ? <p className="text-sm text-emerald-400">{info}</p> : null}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
