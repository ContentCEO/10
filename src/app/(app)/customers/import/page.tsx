import { Upload } from "lucide-react";
import { ImportClient } from "./ImportClient";

export const dynamic = "force-dynamic";

export default function CustomerImportPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <header className="card p-6 sm:p-7 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-gradient opacity-15 blur-3xl" />
        <div className="relative">
          <span className="section-eyebrow"><Upload className="h-3.5 w-3.5" /> Customers · Bulk Import</span>
          <h1 className="mt-2 display-h2">
            Import customers from <em>CSV</em>
          </h1>
          <p className="mt-2 text-sm text-ink-600 max-w-xl">
            Headers we recognize:{" "}
            <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">name</code>{" "}(required),{" "}
            <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">phone</code>,{" "}
            <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">email</code>,{" "}
            <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">address</code>,{" "}
            <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">city</code>,{" "}
            <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">state</code>,{" "}
            <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">zip</code>,{" "}
            <code className="text-xs bg-ink-100 px-1.5 py-0.5 rounded">notes</code>.{" "}
            Dedupes by email. Max 500 rows per upload.
          </p>
        </div>
      </header>

      <ImportClient />
    </div>
  );
}
