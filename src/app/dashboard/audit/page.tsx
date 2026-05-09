import Link from "next/link";
import { getActiveBusiness, latestAudit, listAudits } from "@/lib/data";
import { RunAuditButton } from "@/components/RunAuditButton";

export default async function AuditPage() {
  const b = await getActiveBusiness();
  if (!b) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Set up your business first</h1>
        <p className="mt-2 text-sm text-slate-600">We need a few details to run an audit.</p>
        <Link href="/dashboard/business" className="btn-primary mt-4 inline-flex">Add business</Link>
      </div>
    );
  }
  const audit = await latestAudit(b.id);
  const all = await listAudits(b.id);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">SEO audit</h1>
          <p className="text-sm text-slate-600">Snapshot of your local SEO health for {b.name}.</p>
        </div>
        <RunAuditButton businessId={b.id} />
      </div>

      {!audit ? (
        <div className="card">
          <p className="text-sm text-slate-600">No audit yet — run one to see your score, findings, and an AI plan.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card">
              <div className="text-xs uppercase text-slate-500">SEO score</div>
              <div className="mt-1 text-4xl font-semibold text-brand-700">{audit.score}<span className="text-base text-slate-500">/100</span></div>
            </div>
            <div className="card sm:col-span-2">
              <div className="text-xs uppercase text-slate-500">Summary</div>
              <p className="mt-2 text-sm text-slate-700">{audit.summary}</p>
            </div>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-slate-900">Findings</h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {audit.findings.map((f, i) => (
                <li key={i} className="py-3">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${severityClass(f.severity)}`}>{f.severity}</span>
                    <span className="text-xs uppercase tracking-wide text-slate-500">{f.area}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-900">{f.issue}</div>
                  <div className="mt-1 text-sm text-slate-600">{f.recommendation}</div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-slate-900">Audit history</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {all.map((a) => (
                <li key={a.id} className="flex justify-between text-slate-600">
                  <span>{new Date(a.created_at).toLocaleString()}</span>
                  <span>Score {a.score}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
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
