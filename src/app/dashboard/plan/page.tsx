import Link from "next/link";
import { getActiveBusiness, latestAudit } from "@/lib/data";
import { RunAuditButton } from "@/components/RunAuditButton";

export default async function PlanPage() {
  const b = await getActiveBusiness();
  if (!b) {
    return (
      <div className="card">
        <h1 className="text-xl font-semibold">Set up your business first</h1>
        <Link href="/dashboard/business" className="btn-primary mt-4 inline-flex">Add business</Link>
      </div>
    );
  }
  const audit = await latestAudit(b.id);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Improvement plan</h1>
          <p className="text-sm text-slate-600">A prioritized, AI-generated roadmap from your latest audit.</p>
        </div>
        <RunAuditButton businessId={b.id} />
      </div>

      {!audit ? (
        <div className="card text-sm text-slate-600">No plan yet — run an audit to generate one.</div>
      ) : audit.plan.length === 0 ? (
        <div className="card text-sm text-slate-600">No plan items in this audit.</div>
      ) : (
        <ol className="space-y-3">
          {audit.plan.map((p) => (
            <li key={p.step} className="card">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                  {p.step}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900">{p.title}</h3>
                    <span className="badge bg-slate-100 text-slate-700">effort: {p.effort}</span>
                    <span className="badge bg-brand-50 text-brand-700">impact: {p.impact}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{p.detail}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
