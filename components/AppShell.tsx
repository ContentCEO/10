import Link from "next/link";
import type { Profile } from "@/lib/types";
import { PLAN_LIMITS } from "@/lib/plans";

export function AppShell({
  profile,
  children,
}: {
  profile: Profile | null;
  children: React.ReactNode;
}) {
  const used = profile?.monthly_generations_used ?? 0;
  const limit = PLAN_LIMITS[profile?.plan ?? "free"];

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="inline-block h-6 w-6 rounded-md bg-forge-600" />
              <span className="font-semibold">AdForge AI</span>
            </Link>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/dashboard" className="text-zinc-700 hover:text-forge-700">Dashboard</Link>
              <Link href="/generator" className="text-zinc-700 hover:text-forge-700">Generate</Link>
              <Link href="/business" className="text-zinc-700 hover:text-forge-700">Business</Link>
              <Link href="/billing" className="text-zinc-700 hover:text-forge-700">Billing</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="badge bg-zinc-100 text-zinc-700">
              {profile?.plan ?? "free"} · {used}/{limit}
            </span>
            <form action="/api/auth/signout" method="post">
              <button className="btn-outline" type="submit">Sign out</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
