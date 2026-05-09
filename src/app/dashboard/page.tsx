import Link from "next/link";
import { getActiveBusiness, latestAudit, listChecklist, listTasks } from "@/lib/data";

export default async function DashboardOverview() {
  const business = await getActiveBusiness();
  const audit = business ? await latestAudit(business.id) : null;
  const checklist = business ? await listChecklist(business.id) : [];
  const tasks = business ? await listTasks(business.id) : [];

  const openItems = checklist.filter((c) => c.status !== "done").length;
  const openTasks = tasks.filter((t) => t.status !== "done").length;

  if (!business) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome 👋</h1>
        <p className="mt-2 text-slate-600">
          Let&apos;s get you set up. Add your business profile to generate your first audit.
        </p>
        <Link href="/dashboard/business" className="btn-primary mt-6 inline-flex">
          Set up your business
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{business.name}</h1>
        <p className="text-sm text-slate-600">
          {[business.city, business.region, business.country].filter(Boolean).join(", ") || "Local SEO overview"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="SEO score" value={audit ? `${audit.score}/100` : "—"} href="/dashboard/audit" />
        <Stat label="Open checklist" value={String(openItems)} href="/dashboard/checklist" />
        <Stat label="Active tasks" value={String(openTasks)} href="/dashboard/tasks" />
        <Stat label="Latest audit" value={audit ? new Date(audit.created_at).toLocaleDateString() : "—"} href="/dashboard/audit" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-900">Top findings</h2>
          {audit ? (
            <ul className="mt-3 space-y-2 text-sm">
              {audit.findings.slice(0, 4).map((f, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={`badge ${severityClass(f.severity)}`}>{f.severity}</span>
                  <span className="text-slate-700">{f.issue}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              No audit yet.{" "}
              <Link href="/dashboard/audit" className="text-brand-600 hover:underline">
                Run your first audit →
              </Link>
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="text-sm font-semibold text-slate-900">Next steps</h2>
          {audit && audit.plan.length > 0 ? (
            <ol className="mt-3 space-y-2 text-sm">
              {audit.plan.slice(0, 4).map((p) => (
                <li key={p.step} className="flex items-start gap-2">
                  <span className="badge bg-brand-50 text-brand-700">#{p.step}</span>
                  <span className="text-slate-700">{p.title}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-slate-600">
              Generate a plan from your audit to see prioritized next steps.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="card transition hover:border-brand-300">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </Link>
  );
}

function severityClass(s: string) {
  switch (s) {
    case "critical": return "bg-red-100 text-red-700";
    case "high": return "bg-orange-100 text-orange-700";
    case "medium": return "bg-amber-100 text-amber-800";
    default: return "bg-slate-100 text-slate-700";
  }
}
