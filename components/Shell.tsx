import Link from "next/link";
import SignOutButton from "./SignOutButton";

type NavItem = { href: string; label: string };

export default function Shell({
  title,
  nav,
  user,
  children
}: {
  title: string;
  nav: NavItem[];
  user: { name: string | null; email: string };
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-lg font-bold text-brand-700">HomeCare Club</Link>
            <span className="hidden text-sm text-slate-500 md:inline">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right text-sm md:block">
              <div className="font-medium text-slate-900">{user.name || user.email}</div>
              <div className="text-xs text-slate-500">{user.email}</div>
            </div>
            <SignOutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3 pb-2">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
