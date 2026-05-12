"use client";

import { useState, useTransition } from "react";
import {
  AlertCircle, CheckCircle2, Facebook, FileText, Globe, Loader2,
  Plus, Trash2, Upload, X,
} from "lucide-react";
import {
  pasteNextdoor, pasteFacebook, pasteLicenses, pasteDeeds,
  type NextdoorRow, type FacebookRow, type LicenseRow, type DeedRow,
} from "./actions";

type Source = "nextdoor" | "facebook" | "licenses" | "deeds";

const SOURCES: { id: Source; label: string; icon: typeof Globe; help: string }[] = [
  {
    id: "nextdoor",
    label: "Nextdoor",
    icon: Globe,
    help: "Paste posts from Nextdoor where homeowners are asking for a pro. URL is optional but improves dedup.",
  },
  {
    id: "facebook",
    label: "Facebook Groups",
    icon: Facebook,
    help: "Paste posts from local Facebook groups (Brookline Homeowners, Newton Real Estate, etc.).",
  },
  {
    id: "licenses",
    label: "MA Licenses",
    icon: FileText,
    help: "Paste newly-issued MA contractor licenses from elicensing4.hpl.mass.gov for referral outreach.",
  },
  {
    id: "deeds",
    label: "Deeds",
    icon: FileText,
    help: "Paste recent property-purchase rows from your data vendor. New homeowners spend 3× more on renovation in their first 18 months.",
  },
];

type AnyRow = NextdoorRow | FacebookRow | LicenseRow | DeedRow;

interface FieldDef {
  key: string;
  label: string;
  textarea?: boolean;
  required?: boolean;
  placeholder?: string;
  width?: "full" | "half";
}

const FIELDS: Record<Source, FieldDef[]> = {
  nextdoor: [
    { key: "author",       label: "Author",       width: "half", placeholder: "Jane D." },
    { key: "neighborhood", label: "Neighborhood", width: "half", placeholder: "Brookline Village" },
    { key: "city",         label: "City",         width: "half", placeholder: "Brookline" },
    { key: "zip",          label: "ZIP",          width: "half", placeholder: "02445" },
    { key: "url",          label: "URL",          width: "full", placeholder: "https://nextdoor.com/p/..." },
    { key: "body",         label: "Post body",    textarea: true, required: true, placeholder: "Looking for a roofer in Brookline area..." },
  ],
  facebook: [
    { key: "author", label: "Author", width: "half", placeholder: "John Smith" },
    { key: "group",  label: "Group",  width: "half", placeholder: "Brookline Homeowners" },
    { key: "city",   label: "City",   width: "half", placeholder: "Brookline" },
    { key: "zip",    label: "ZIP",    width: "half", placeholder: "02445" },
    { key: "url",    label: "URL",    width: "full", placeholder: "https://facebook.com/groups/..." },
    { key: "body",   label: "Post body", textarea: true, required: true, placeholder: "Anyone know a good electrician?" },
  ],
  licenses: [
    { key: "license_type",   label: "License type",   width: "half", required: true, placeholder: "HIC / CSL / Electrician / Plumber / HVAC" },
    { key: "license_number", label: "License #",      width: "half", placeholder: "12345" },
    { key: "name",           label: "Name",           width: "half", placeholder: "John Doe" },
    { key: "company",        label: "Company",        width: "half", placeholder: "Doe Electric LLC" },
    { key: "phone",          label: "Phone",          width: "half", placeholder: "(617) 555-0123" },
    { key: "email",          label: "Email",          width: "half", placeholder: "john@doeelectric.com" },
    { key: "city",           label: "City",           width: "half", placeholder: "Boston" },
    { key: "zip",            label: "ZIP",            width: "half", placeholder: "02101" },
    { key: "issued_at",      label: "Issued",         width: "half", placeholder: "2026-04-15" },
    { key: "expires_at",     label: "Expires",        width: "half", placeholder: "2027-04-15" },
  ],
  deeds: [
    { key: "buyer_name",       label: "Buyer name",   width: "half", placeholder: "Jane Buyer" },
    { key: "buyer_phone",      label: "Buyer phone",  width: "half", placeholder: "(617) 555-0124" },
    { key: "buyer_email",      label: "Buyer email",  width: "half", placeholder: "jane@example.com" },
    { key: "price",            label: "Price",        width: "half", placeholder: "850000" },
    { key: "property_address", label: "Property address", width: "full", placeholder: "123 Main St" },
    { key: "city",             label: "City",         width: "half", placeholder: "Brookline" },
    { key: "zip",              label: "ZIP",          width: "half", placeholder: "02445" },
    { key: "county",           label: "County",       width: "half", placeholder: "Norfolk" },
    { key: "date",             label: "Recorded",     width: "half", placeholder: "2026-05-01" },
    { key: "book",             label: "Book",         width: "half", placeholder: "12345" },
    { key: "page",             label: "Page",         width: "half", placeholder: "678" },
    { key: "property_type",    label: "Property type", width: "full", placeholder: "Single family" },
  ],
};

interface ActionResult {
  ok: boolean;
  source: string;
  fetched?: number;
  inserted?: number;
  duplicates?: number;
  skipped?: number;
  error?: string;
}

export function PasteForm() {
  const [source, setSource] = useState<Source>("nextdoor");
  const [mode, setMode] = useState<"form" | "json">("form");
  const [queue, setQueue] = useState<Record<Source, AnyRow[]>>({
    nextdoor: [], facebook: [], licenses: [], deeds: [],
  });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [jsonText, setJsonText] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fields = FIELDS[source];
  const currentQueue = queue[source];

  function addRow() {
    setError(null);
    const required = fields.filter((f) => f.required);
    for (const f of required) {
      if (!draft[f.key]?.trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    const cleaned: AnyRow = {} as AnyRow;
    for (const f of fields) {
      const v = draft[f.key]?.trim();
      if (v) (cleaned as Record<string, string>)[f.key] = v;
    }
    setQueue((q) => ({ ...q, [source]: [...q[source], cleaned] }));
    setDraft({});
  }

  function removeRow(i: number) {
    setQueue((q) => ({ ...q, [source]: q[source].filter((_, idx) => idx !== i) }));
  }

  function clearQueue() {
    setQueue((q) => ({ ...q, [source]: [] }));
    setResult(null);
  }

  function parseJson() {
    setError(null);
    try {
      const parsed = JSON.parse(jsonText);
      const arr = Array.isArray(parsed) ? parsed
        : Array.isArray(parsed.posts) ? parsed.posts
        : Array.isArray(parsed.rows)  ? parsed.rows
        : null;
      if (!arr) throw new Error("JSON must be an array, or an object with 'posts' / 'rows' array.");
      setQueue((q) => ({ ...q, [source]: [...q[source], ...arr as AnyRow[]] }));
      setJsonText("");
      setMode("form");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
    }
  }

  function submit() {
    setError(null);
    setResult(null);
    if (currentQueue.length === 0) {
      setError("Queue is empty — add at least one row first.");
      return;
    }
    startTransition(async () => {
      let r: ActionResult;
      if (source === "nextdoor") r = await pasteNextdoor(currentQueue as NextdoorRow[]);
      else if (source === "facebook") r = await pasteFacebook(currentQueue as FacebookRow[]);
      else if (source === "licenses") r = await pasteLicenses(currentQueue as LicenseRow[]);
      else r = await pasteDeeds(currentQueue as DeedRow[]);
      setResult(r);
      if (r.ok) {
        setQueue((q) => ({ ...q, [source]: [] }));
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Source tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {SOURCES.map(({ id, label, icon: Icon }) => {
          const active = source === id;
          const count = queue[id].length;
          return (
            <button
              key={id}
              onClick={() => { setSource(id); setResult(null); setError(null); }}
              className={
                active
                  ? "card p-4 ring-2 ring-brand-500 shadow-glow flex items-center justify-between gap-3"
                  : "card card-hover p-4 flex items-center justify-between gap-3"
              }
            >
              <span className="flex items-center gap-2.5">
                <span className={
                  active
                    ? "inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-white shadow-glow"
                    : "inline-flex h-9 w-9 items-center justify-center rounded-lg bg-ink-100 text-ink-600"
                }>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="font-semibold text-sm">{label}</span>
              </span>
              {count > 0 && (
                <span className="badge bg-brand-100 text-brand-700 ring-brand-200">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Help blurb */}
      <div className="text-sm text-ink-600 px-1">
        {SOURCES.find((s) => s.id === source)?.help}
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("form")}
          className={mode === "form" ? "btn-primary" : "btn-secondary"}
        >
          <Plus className="h-4 w-4" /> Form
        </button>
        <button
          onClick={() => setMode("json")}
          className={mode === "json" ? "btn-primary" : "btn-secondary"}
        >
          <Upload className="h-4 w-4" /> Bulk JSON
        </button>
      </div>

      {/* Entry area */}
      {mode === "form" ? (
        <div className="card p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.key} className={f.width === "full" || f.textarea ? "sm:col-span-2" : ""}>
                <label htmlFor={f.key} className="label">
                  {f.label}{f.required && <span className="text-rose-500 ml-1">*</span>}
                </label>
                {f.textarea ? (
                  <textarea
                    id={f.key}
                    rows={5}
                    className="input min-h-[120px]"
                    value={draft[f.key] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                ) : (
                  <input
                    id={f.key}
                    type="text"
                    className="input"
                    value={draft[f.key] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={addRow} className="btn-primary">
              <Plus className="h-4 w-4" /> Add to queue
            </button>
            <button onClick={() => setDraft({})} className="btn-ghost">
              Clear form
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-6 space-y-3">
          <label className="label" htmlFor="bulk-json">Paste JSON array or {`{ posts: [...] }`} / {`{ rows: [...] }`}</label>
          <textarea
            id="bulk-json"
            rows={10}
            className="input font-mono text-xs"
            placeholder='[{"body": "...", "city": "Brookline"}, {"body": "...", "city": "Newton"}]'
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
          />
          <div className="flex items-center gap-2">
            <button onClick={parseJson} className="btn-primary">
              <Upload className="h-4 w-4" /> Parse & add to queue
            </button>
            <button onClick={() => setJsonText("")} className="btn-ghost">
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Errors */}
      {error && (
        <div className="card p-4 border-rose-200 bg-rose-50/60 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-800">{error}</div>
          <button onClick={() => setError(null)} className="ml-auto text-rose-600 hover:text-rose-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Queue */}
      {currentQueue.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold tracking-tight">
              Queue · {currentQueue.length} row{currentQueue.length === 1 ? "" : "s"}
            </h3>
            <button onClick={clearQueue} className="btn-ghost text-rose-600">
              <Trash2 className="h-4 w-4" /> Clear queue
            </button>
          </div>
          <ul className="divide-y divide-ink-100">
            {currentQueue.map((row, i) => (
              <li key={i} className="py-3 flex items-start gap-3">
                <span className="text-xs font-mono text-ink-400 mt-1 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                <div className="text-sm flex-1 min-w-0">
                  <code className="text-xs text-ink-700 break-words whitespace-pre-wrap block">
                    {JSON.stringify(row, null, 2).slice(0, 280)}
                    {JSON.stringify(row).length > 280 ? "…" : ""}
                  </code>
                </div>
                <button onClick={() => removeRow(i)} className="text-ink-400 hover:text-rose-600 shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button onClick={submit} disabled={pending} className="btn-primary">
              {pending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                <>Submit {currentQueue.length} row{currentQueue.length === 1 ? "" : "s"}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={
          result.ok
            ? "card p-5 border-emerald-200 bg-emerald-50/50"
            : "card p-5 border-rose-200 bg-rose-50/50"
        }>
          <div className="flex items-start gap-3">
            {result.ok ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-semibold text-sm">
                {result.ok ? "Submitted." : "Failed."}
              </div>
              {result.ok ? (
                <div className="mt-1 text-sm text-ink-700">
                  Fetched <strong>{result.fetched ?? 0}</strong> ·
                  Inserted <strong className="text-emerald-700">{result.inserted ?? 0}</strong> ·
                  Duplicates <strong>{result.duplicates ?? 0}</strong>
                  {result.skipped != null && <> · Skipped <strong>{result.skipped}</strong></>}
                </div>
              ) : (
                <div className="mt-1 text-sm text-rose-700">{result.error}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
