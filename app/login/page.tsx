import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <span className="inline-block h-7 w-7 rounded-md bg-forge-600" />
          <span className="text-lg font-semibold">AdForge AI</span>
        </Link>
        <div className="card">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-zinc-600">Log in to your AdForge AI account.</p>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
          <p className="mt-6 text-sm text-zinc-600">
            No account?{" "}
            <Link href="/signup" className="font-medium text-forge-700 hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
