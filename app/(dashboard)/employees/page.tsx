import Link from "next/link";
import { requireOrg } from "@/lib/auth";

export default async function EmployeesListPage() {
  const { org, supabase } = await requireOrg();
  const { data: employees } = await supabase
    .from("ai_employees")
    .select("id, name, role, is_published, public_slug, created_at")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">AI Employees</h1>
          <p className="mt-1 text-sm text-slate-600">
            Each AI employee has its own knowledge, tone, and chat URL.
          </p>
        </div>
        <Link href="/employees/new" className="btn-primary">
          + New AI Employee
        </Link>
      </div>

      {employees && employees.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {employees.map((e) => (
            <Link key={e.id} href={`/employees/${e.id}`} className="card p-5 hover:border-brand-400">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">{e.name}</h2>
                {e.is_published ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Live
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    Draft
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs capitalize text-slate-500">{e.role}</p>
              {e.public_slug && (
                <p className="mt-3 truncate text-xs text-slate-500">/{e.public_slug}</p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="card p-10 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Hire your first AI employee
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Start with the AI Receptionist for contractors.
          </p>
          <Link href="/employees/new" className="btn-primary mt-4 inline-flex">
            Create AI Receptionist
          </Link>
        </div>
      )}
    </div>
  );
}
