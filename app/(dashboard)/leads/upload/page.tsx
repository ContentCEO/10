"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadCsvPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("csv-import");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const text = await file.text();
    const res = await fetch("/api/leads/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv: text, source }),
    });
    setLoading(false);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Upload failed");
      return;
    }
    setResult(json);
    setTimeout(() => router.push("/leads"), 800);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Upload leads CSV</h1>
      <p className="text-sm text-slate-600 mt-1">
        We'll auto-detect columns: name, email, phone, company, notes, source, tags.
      </p>

      <form onSubmit={onSubmit} className="mt-6 card p-6 space-y-5">
        <div>
          <label className="label">CSV file</label>
          <input
            type="file"
            accept=".csv,text/csv"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          />
        </div>
        <div>
          <label className="label">Source label</label>
          <input
            className="input"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. 2023 dormant leads"
          />
          <p className="text-xs text-slate-500 mt-1">
            Tags this batch so you can filter later. Optional.
          </p>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {result && (
          <p className="text-sm text-emerald-700">
            Imported {result.inserted} leads. Skipped {result.skipped}.
          </p>
        )}
        <button className="btn-primary" disabled={loading || !file}>
          {loading ? "Uploading…" : "Upload"}
        </button>
      </form>

      <div className="mt-8 card p-6">
        <h3 className="font-semibold">Sample CSV</h3>
        <pre className="mt-3 text-xs bg-slate-50 p-4 rounded overflow-x-auto">{`first_name,last_name,email,phone,company,notes,source,tags
Alex,Rivera,alex@acme.com,+15551234567,Acme,Asked about pricing in March,referral,"hot,enterprise"
Sam,Chen,sam@globex.com,5559876543,Globex,Demoed but never replied,webinar,
`}</pre>
      </div>
    </div>
  );
}
