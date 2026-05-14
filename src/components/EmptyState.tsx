import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/*
 * Plan 1 / F-7 — Empty-state illustrations.
 *
 * Friendlier than "No results." Renders an icon-in-gradient circle, a
 * headline, supporting text, and an optional CTA link. Use anywhere a
 * list might be empty.
 *
 *   <EmptyState
 *     icon={Briefcase}
 *     headline="No leads yet"
 *     body="Add one manually or wait for a marketplace match."
 *     cta={{ label: "Add a lead", href: "/leads/new" }}
 *   />
 */

export function EmptyState({
  icon: Icon,
  headline,
  body,
  cta,
  tone = "indigo",
}: {
  icon: LucideIcon;
  headline: string;
  body?: string;
  cta?: { label: string; href: string };
  tone?: "indigo" | "emerald" | "amber" | "rose";
}) {
  const palette = {
    indigo:  { ring: "from-indigo-100 via-violet-100 to-fuchsia-100",   icon: "from-indigo-500 to-violet-500" },
    emerald: { ring: "from-emerald-100 via-teal-100 to-cyan-100",       icon: "from-emerald-500 to-teal-500" },
    amber:   { ring: "from-amber-100 via-orange-100 to-rose-100",       icon: "from-amber-500 to-orange-500" },
    rose:    { ring: "from-rose-100 via-fuchsia-100 to-pink-100",       icon: "from-rose-500 to-pink-500" },
  }[tone];

  return (
    <div className="text-center py-10 px-6">
      <div className={`mx-auto h-20 w-20 rounded-full bg-gradient-to-br ${palette.ring} flex items-center justify-center`}>
        <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${palette.icon} text-white shadow-glow flex items-center justify-center`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-ink-900">{headline}</h3>
      {body && <p className="mt-1 text-sm text-ink-600 max-w-sm mx-auto">{body}</p>}
      {cta && (
        <Link href={cta.href} className="btn-primary mt-5 inline-flex">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
