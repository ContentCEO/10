import Link from "next/link";
import { requireOrg } from "@/lib/auth";

export default async function DashboardPage() {
  const { org, supabase } = await requireOrg();

  const { data: employees } = await supabase
    .from("ai_employees")
    .select("id, name, role, is_published, public_slug, created_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });

  const employeeIds = (employees ?? []).map((e) => e.id);

  const [{ count: leadCount }, { count: convCount }] =
    employeeIds.length === 0
      ? [{ count: 0 }, { count: 0 }]
      : await Promise.all([
          supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .in("ai_employee_id", employeeIds),
          supabase
            .from("conversations")
            .select("id", { count: "exact", head: true })
            .in("ai_employee_id", employeeIds),
        ]);

  const recent = (employees ?? []).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">Overview of your AI workforce.</p>
        </div>
        <Link href="/employees/new" className="btn-primary">
          + New AI Employee
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="AI employees" value={employeeIds.length} />
        <Stat label="Conversations" value={convCount ?? 0} />
        <Stat label="Leads captured" value={leadCount ?? 0} />
      </div>

      <section className="card">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">Recent AI employees</h2>
          <Link href="/employees" className="text-sm text-brand-700 hover:text-brand-800">
            View all
          </Link>
        </header>
        {recent.length > 0 ? (
          <ul className="divide-y divide-slate-200">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <Link
                    href={`/employees/${e.id}`}
                    className="text-sm font-medium text-slate-900 hover:underline"
                  >
                    {e.name}
                  </Link>
                  <p className="text-xs capitalize text-slate-500">{e.role}</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {e.is_published ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700">
                      Live
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                      Draft
                    </span>
                  )}
                  {e.public_slug && (
                    <Link
                      href={`/chat/${e.public_slug}`}
                      target="_blank"
                      className="text-brand-700 hover:text-brand-800"
                    >
                      Open chat
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5 py-8 text-center text-sm text-slate-600">
            No AI employees yet.{" "}
            <Link href="/employees/new" className="font-medium text-brand-700 hover:text-brand-800">
              Create your first one
            </Link>
            .
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
