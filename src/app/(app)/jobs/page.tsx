import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { JobStatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("jobs").select("*").order("created_at", { ascending: false });
  const jobs = (data ?? []) as Job[];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <Link href="/jobs/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New job
        </Link>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Start</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">End</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {jobs.length ? jobs.map((j) => (
              <tr key={j.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/jobs/${j.id}`} className="font-medium text-brand-700">{j.title}</Link>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">{formatDate(j.start_date)}</td>
                <td className="px-4 py-3 hidden md:table-cell">{formatDate(j.end_date)}</td>
                <td className="px-4 py-3">{formatCurrency(j.price)}</td>
                <td className="px-4 py-3"><JobStatusBadge status={j.status} /></td>
              </tr>
            )) : (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                No jobs yet. <Link href="/jobs/new" className="text-brand-600 font-medium">Create one.</Link>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
