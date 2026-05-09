import Link from "next/link";
import { Logo } from "./Logo";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "./SignOutButton";

export async function AppNav() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-ink-700 bg-ink-900/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Logo href={user ? "/dashboard" : "/"} />
          {user ? (
            <nav className="hidden gap-1 md:flex">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/analyze">Analyze call</NavLink>
              <NavLink href="/scripts">Scripts</NavLink>
              <NavLink href="/objections">Objections</NavLink>
              <NavLink href="/billing">Billing</NavLink>
            </nav>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-xs text-ink-400 md:inline">
                {user.email}
              </span>
              <SignOutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-sm text-ink-200 hover:bg-ink-700/60"
    >
      {children}
    </Link>
  );
}
