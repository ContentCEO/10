import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="mx-auto w-full max-w-6xl px-6 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white">
            AI
          </span>
          AIStaffer
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-16 pt-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
