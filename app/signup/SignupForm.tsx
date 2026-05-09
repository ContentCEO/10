"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function SignupForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"customer" | "admin">("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role }
      }
    });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    if (phone && data.user) {
      await supabase.from("profiles").update({ phone }).eq("id", data.user.id);
    }

    setLoading(false);
    if (data.session) {
      router.push(role === "admin" ? "/admin" : "/dashboard");
      router.refresh();
    } else {
      setInfo("Check your email to confirm your account, then log in.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div>
        <label className="label">I am a…</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`btn ${role === "customer" ? "btn-primary" : "btn-secondary"}`}
          >
            Homeowner
          </button>
          <button
            type="button"
            onClick={() => setRole("admin")}
            className={`btn ${role === "admin" ? "btn-primary" : "btn-secondary"}`}
          >
            Handyman business
          </button>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="fullName">Full name</label>
        <input id="fullName" required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="phone">Phone (for SMS reminders)</label>
        <input id="phone" type="tel" className="input" placeholder="+15551234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" type="password" required minLength={8} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      {info && <p className="text-sm text-emerald-700">{info}</p>}
      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
