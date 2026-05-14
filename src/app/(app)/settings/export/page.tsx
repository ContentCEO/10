import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

const TABLES = [
  { key: "leads",     label: "Leads",     desc: "Everything in your pipeline + closed leads" },
  { key: "customers", label: "Customers", desc: "Address book with recurring schedule flags" },
  { key: "jobs",      label: "Jobs",      desc: "Every scheduled / completed job with prices" },
  { key: "invoices",  label: "Invoices",  desc: "All invoices, paid + outstanding" },
  { key: "expenses",  label: "Expenses",  desc: "Per-job material / labor / sub costs" },
];

export default function ExportPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Download className="h-3.5 w-3.5" /> Settings · Export</span>
          <h1 className="mt-2 display-h2">
            Take <em>your data</em> with you
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Download any of your tables as CSV. Open in Excel, Google Sheets,
            or feed into Zapier / Make / your accountant. Capped at 10,000 rows
            per download.
          </p>
        </div>
      </header>

      <section className="card overflow-hidden">
        <ul className="divide-y divide-ink-100">
          {TABLES.map((t) => (
            <li key={t.key} className="px-4 py-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="text-xs text-ink-500">{t.desc}</div>
              </div>
              <a href={`/api/export/csv?table=${t.key}`}
                className="btn-primary text-sm shrink-0">
                <Download className="h-4 w-4" /> CSV
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
