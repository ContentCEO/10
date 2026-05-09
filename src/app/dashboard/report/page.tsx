import Link from "next/link";
import { getActiveBusiness, latestAudit, listTasks } from "@/lib/data";

export default async function ReportPage() {
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
  const tasks = await listTasks(b.id);
  const completedTasks = tasks.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Monthly SEO report</h1>
          <p className="text-sm text-slate-600">A polished PDF you can send to stakeholders or clients.</p>
        </div>
        <a
          href={`/api/report?businessId=${b.id}`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary"
        >
          Download PDF
        </a>
      </div>

      <div className="card">
        <h2 className="text-sm font-semibold text-slate-900">Report includes</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          <li>· Executive summary for {b.name}</li>
          <li>· Latest audit score{audit ? ` (currently ${audit.score}/100)` : " — none yet"}</li>
          <li>· Findings with severity</li>
          <li>· Prioritized improvement plan</li>
          <li>· Tasks completed this month ({completedTasks})</li>
        </ul>
      </div>
    </div>
  );
}
