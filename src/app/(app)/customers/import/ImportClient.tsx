"use client";

import { useState, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "@/components/Toaster";

const SAMPLE = `name,phone,email,address,city,state,zip,notes
Jane Smith,617-555-0101,jane@example.com,12 Maple St,Boston,MA,02115,referred by mike
Bob Lee,617-555-0202,bob@example.com,40 Oak Ave,Cambridge,MA,02139,quarterly HVAC`;

export function ImportClient() {
  const [csv, setCsv] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ processed: number; inserted: number; duplicates: number; failed: number } | null>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setCsv(text);
    };
    reader.readAsText(file);
  }

  function run() {
    if (!csv.trim()) {
      toast({ message: "Paste or upload CSV first", type: "error" });
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/customers/import", {
          method: "POST",
          headers: { "Content-Type": "text/csv" },
          body: csv,
        });
        const json = await res.json();
        if (!res.ok) {
          toast({ message: json.error ?? "Import failed", type: "error" });
          return;
        }
        setResult(json);
        toast({ message: `Imported ${json.inserted}`, type: "success" });
      } catch {
        toast({ message: "Network error", type: "error" });
      }
    });
  }

  return (
    <>
      <section className="card p-5 space-y-4">
        <div>
          <label className="label">Upload .csv file</label>
          <input type="file" accept=".csv,text/csv"
            className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-brand-700 file:font-medium hover:file:bg-brand-100 cursor-pointer"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }} />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-ink-500">or paste CSV below:</span>
          <button onClick={() => setCsv(SAMPLE)} className="text-brand-600 font-medium hover:underline">
            use sample
          </button>
        </div>

        <textarea
          className="input min-h-[180px] font-mono text-xs"
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          placeholder="name,phone,email,address,city,state,zip,notes&#10;Jane Smith,617-555-0101,jane@example.com,12 Maple St,Boston,MA,02115,"
        />

        <button onClick={run} disabled={pending || !csv.trim()} className="btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Import
        </button>
      </section>

      {result && (
        <section className="card p-4 bg-gradient-to-br from-brand-50/60 via-white to-violet-50/40">
          <div className="text-sm">
            Imported <strong className="font-mono tabular-nums">{result.inserted}</strong> of{" "}
            <strong className="font-mono tabular-nums">{result.processed}</strong>.
            {result.duplicates > 0 && <span className="text-amber-700"> {result.duplicates} duplicate{result.duplicates === 1 ? "" : "s"} skipped.</span>}
            {result.failed > 0 && <span className="text-rose-600"> {result.failed} failed.</span>}
          </div>
        </section>
      )}
    </>
  );
}
