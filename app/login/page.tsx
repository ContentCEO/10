import Link from "next/link";
import LoginForm from "./LoginForm";

export default function LoginPage({
  searchParams
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <Link href="/" className="text-sm text-brand-700 hover:underline">← Back home</Link>
      <div className="card mt-4 p-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600">Log in to your HomeCare Club account.</p>
        {searchParams.error && (
          <div className="mt-4 rounded-md bg-rose-50 p-3 text-sm text-rose-700">
            {searchParams.error}
          </div>
        )}
        <LoginForm next={searchParams.next} />
        <p className="mt-6 text-center text-sm text-slate-600">
          New to HomeCare Club?{" "}
          <Link href="/signup" className="font-medium text-brand-700 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}
