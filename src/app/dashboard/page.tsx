import Link from "next/link";
import { FilePlus2, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { currency, shortDate } from "@/lib/format";
import type { Proposal } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: proposals = [] } = await supabase
    .from("proposals")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const list = (proposals ?? []) as Proposal[];
  const totalValue = list.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
  const sent = list.filter((p) => p.status === "sent" || p.status === "accepted").length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Proposals</h1>
          <p className="mt-1 text-sm text-gray-600">All your jobs in one place.</p>
        </div>
        <Link href="/proposals/new" className="btn-primary">
          <FilePlus2 size={16} /> New proposal
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Total proposals" value={String(list.length)} />
        <Stat label="Sent / accepted" value={String(sent)} />
        <Stat label="Pipeline value" value={currency(totalValue)} />
      </div>

      <div className="mt-6 card overflow-hidden">
        {list.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-gray-100">
            {list.map((p) => (
              <li key={p.id}>
                <Link href={`/proposals/${p.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-gray-50 sm:p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                      <FileText size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-gray-900">{p.client_name || "Untitled"}</p>
                      <p className="truncate text-sm text-gray-500">
                        {p.project_type || "Project"} · {shortDate(p.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={p.status} />
                    <span className="hidden text-sm font-medium text-gray-900 sm:inline">{currency(Number(p.total_amount || 0))}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Proposal["status"] }) {
  const styles: Record<Proposal["status"], string> = {
    draft: "bg-gray-100 text-gray-700",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-green-100 text-green-700",
    declined: "bg-red-100 text-red-700",
  };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status]}`}>{status}</span>;
}

function EmptyState() {
  return (
    <div className="p-10 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-700">
        <FileText size={20} />
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">No proposals yet</h3>
      <p className="mt-1 text-sm text-gray-600">Create your first proposal in under 10 minutes.</p>
      <Link href="/proposals/new" className="btn-primary mt-5 inline-flex">
        <FilePlus2 size={16} /> Create your first proposal
      </Link>
    </div>
  );
}
