import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("customers").select("*").order("created_at", { ascending: false });
  const customers = (data ?? []) as Customer[];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Link href="/customers/new" className="btn-primary">
          <Plus className="h-4 w-4" /> New customer
        </Link>
      </header>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">Phone</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Email</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Added</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.length ? customers.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="font-medium text-brand-700">
                    {c.name}
                  </Link>
                  <div className="text-xs text-slate-500 truncate">{c.address ?? "—"}</div>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">{c.phone ?? "—"}</td>
                <td className="px-4 py-3 hidden md:table-cell">{c.email ?? "—"}</td>
                <td className="px-4 py-3 hidden lg:table-cell text-slate-500">{formatDate(c.created_at)}</td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-slate-500">
                No customers yet. <Link href="/customers/new" className="text-brand-600 font-medium">Add one.</Link>
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
