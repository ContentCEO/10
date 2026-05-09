import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { isSupabaseConfigured } from "@/lib/env";

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Link href="/" className="mb-6 text-center text-lg font-semibold text-brand-700">
        LocalRank<span className="text-brand-500">AI</span>
      </Link>
      <div className="card">
        <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Log in to your dashboard.</p>
        <AuthForm mode="login" />
        {!isSupabaseConfigured && (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
            Supabase isn&apos;t configured — you can still explore the dashboard in demo mode.
          </p>
        )}
        <p className="mt-4 text-center text-sm text-slate-600">
          New here?{" "}
          <Link href="/signup" className="font-medium text-brand-600 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
      <p className="mt-4 text-center text-xs">
        <Link href="/dashboard" className="text-slate-500 hover:underline">
          Skip auth → enter demo dashboard
        </Link>
      </p>
    </div>
  );
}
