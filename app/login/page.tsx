import Link from "next/link";
import { Logo } from "@/components/Logo";
import { LoginForm } from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="card">
          <h1 className="text-2xl font-semibold text-white">Sign in</h1>
          <p className="mt-1 text-sm text-ink-400">
            Welcome back. Let's close more jobs.
          </p>
          <LoginForm next={searchParams.next} />
          {searchParams.error ? (
            <p className="mt-3 text-sm text-red-400">{searchParams.error}</p>
          ) : null}
          <p className="mt-6 text-center text-sm text-ink-400">
            New here?{" "}
            <Link href="/signup" className="text-brand-300 hover:text-brand-200">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
