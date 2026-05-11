import Link from "next/link";
import { Briefcase, ExternalLink, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer, Invoice, Job, Profile } from "@/lib/types";
import { JobStatusBadge, InvoiceStatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function CustomerPortalPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();

  // Match homeowner to any customers contractors created with the same email.
  const email = user.email ?? "";
  const { data: matchedCustomers } = await admin
    .from("customers").select("*").eq("email", email);
  const customers = (matchedCustomers ?? []) as Customer[];

  if (customers.length === 0) {
    return (
      <div className="space-y-6">
        <section className="card p-8 text-center">
          <h1 className="text-2xl font-bold">Your service portal</h1>
          <p className="mt-2 text-sm text-slate-600">
            Once a contractor adds you as a customer, your upcoming jobs and invoices
            will appear here. Make sure the email they have on file matches yours
            (<strong>{email}</strong>).
          </p>
          <Link href="/home" className="btn-primary mt-6 inline-flex">
            Back to home
          </Link>
        </section>
      </div>
    );
  }

  const customerIds = customers.map((c) => c.id);
  const contractorIds = Array.from(new Set(customers.map((c) => c.user_id)));

  const [{ data: jobs }, { data: invoices }, { data: contractors }] = await Promise.all([
    admin.from("jobs").select("*").in("customer_id", customerIds)
      .order("created_at", { ascending: false }),
    admin.from("invoices").select("*").in("customer_id", customerIds)
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("id,business_name,phone_public,logo_url,payment_link_url")
      .in("id", contractorIds),
  ]);

  const jobList = (jobs ?? []) as Job[];
  const invoiceList = (invoices ?? []) as Invoice[];
  type ContractorRow = Pick<Profile, "id" | "business_name" | "phone_public" | "logo_url"> & { payment_link_url: string | null };
  const contractorMap = new Map(
    ((contractors ?? []) as ContractorRow[]).map((c) => [c.id, c]),
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Your service portal</h1>
        <p className="text-sm text-slate-500">
          All your jobs and invoices in one place.
        </p>
      </header>

      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-brand-600" /> Jobs
        </h2>
        {jobList.length ? (
          <ul className="card divide-y divide-slate-100">
            {jobList.map((j) => {
              const cust = customers.find((c) => c.id === j.customer_id);
              const pro = cust ? contractorMap.get(cust.user_id) : null;
              return (
                <li key={j.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{j.title}</div>
                    <div className="text-xs text-slate-500">
                      {pro?.business_name ?? "—"} ·{" "}
                      {j.start_date ? `Start ${formatDate(j.start_date)} · ` : ""}
                      {formatCurrency(j.price)}
                    </div>
                  </div>
                  <JobStatusBadge status={j.status} />
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card p-6 text-sm text-center text-slate-500">
            No jobs scheduled yet.
          </div>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-brand-600" /> Invoices
        </h2>
        {invoiceList.length ? (
          <ul className="card divide-y divide-slate-100">
            {invoiceList.map((i) => {
              const cust = customers.find((c) => c.id === i.customer_id);
              const pro = cust ? contractorMap.get(cust.user_id) : null;
              return (
                <li key={i.id} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {i.number ?? `INV-${i.id.slice(0, 6).toUpperCase()}`}
                    </div>
                    <div className="text-xs text-slate-500">
                      {pro?.business_name ?? "—"} ·
                      {" "}Due {i.due_at ? formatDate(i.due_at) : "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">
                      {money(i.amount_cents + i.tax_cents)}
                    </span>
                    <InvoiceStatusBadge status={i.status} />
                    <a href={`/i/${i.id}`} target="_blank" rel="noreferrer"
                      className="btn-secondary !py-1 text-xs">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="card p-6 text-sm text-center text-slate-500">
            No invoices yet.
          </div>
        )}
      </section>
    </div>
  );
}
