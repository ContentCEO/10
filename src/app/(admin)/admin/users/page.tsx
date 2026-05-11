import Link from "next/link";
import { Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface ProfileRow {
  id: string;
  email: string | null;
  business_name: string | null;
  account_type: string;
  subscription_status: string | null;
  credit_cents: number | null;
  is_published: boolean | null;
  created_at: string;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { type?: string; q?: string };
}) {
  const admin = createAdminClient();
  let query = admin.from("profiles").select("*").order("created_at", { ascending: false }).limit(200);
  if (searchParams.type) query = query.eq("account_type", searchParams.type);
  if (searchParams.q) {
    const q = searchParams.q;
    query = query.or(`email.ilike.%${q}%,business_name.ilike.%${q}%`);
  }
  const { data } = await query;
  const users = (data ?? []) as ProfileRow[];

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin" className="text-sm text-slate-500">← Overview</Link>
        <h1 className="mt-1 text-2xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-brand-600" /> All users ({users.length})
        </h1>
      </header>

      <form className="card p-4 grid sm:grid-cols-[1fr_180px_auto] gap-2" action="/admin/users">
        <input name="q" defaultValue={searchParams.q ?? ""} className="input"
          placeholder="Search email or business name" />
        <select name="type" className="input" defaultValue={searchParams.type ?? ""}>
          <option value="">All types</option>
          <option value="contractor">Contractor</option>
          <option value="homeowner">Homeowner</option>
          <option value="employee">Employee</option>
          <option value="agency">Agency</option>
        </select>
        <button className="btn-primary">Filter</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3 font-medium">Email / business</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Wallet</th>
              <th className="px-4 py-3 font-medium">Sub</th>
              <th className="px-4 py-3 font-medium">Pub</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <div className="font-medium truncate max-w-xs">{u.business_name ?? "—"}</div>
                  <div className="text-xs text-slate-500 truncate max-w-xs">{u.email ?? "—"}</div>
                </td>
                <td className="px-4 py-2.5 text-xs">{u.account_type}</td>
                <td className="px-4 py-2.5 text-xs">${((u.credit_cents ?? 0) / 100).toFixed(0)}</td>
                <td className="px-4 py-2.5 text-xs">{u.subscription_status ?? "—"}</td>
                <td className="px-4 py-2.5 text-xs">{u.is_published ? "✓" : ""}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{formatDate(u.created_at)}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No matches.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
