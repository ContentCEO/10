"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Save, Trash2, Plus, Download, Loader2,
} from "lucide-react";
import { currency, uid } from "@/lib/format";
import type {
  LineItem, PaymentMilestone, Proposal, ProposalDraftInput, ProposalPhoto, TimelinePhase,
} from "@/lib/types";
import { PhotoUpload } from "./PhotoUpload";

type EditorState = {
  client_name: string;
  client_email: string;
  client_address: string;
  project_type: string;
  scope: string;
  measurements: string;
  materials: string;
  labor: string;
  notes: string;
  generated_text: string;
  line_items: LineItem[];
  payment_schedule: PaymentMilestone[];
  timeline: TimelinePhase[];
  terms: string;
  photos: ProposalPhoto[];
  status: Proposal["status"];
};

function emptyState(initial?: Partial<Proposal>): EditorState {
  return {
    client_name: initial?.client_name ?? "",
    client_email: initial?.client_email ?? "",
    client_address: initial?.client_address ?? "",
    project_type: initial?.project_type ?? "",
    scope: initial?.scope ?? "",
    measurements: initial?.measurements ?? "",
    materials: initial?.materials ?? "",
    labor: initial?.labor ?? "",
    notes: initial?.notes ?? "",
    generated_text: initial?.generated_text ?? "",
    line_items: (initial?.line_items as LineItem[]) ?? [],
    payment_schedule: (initial?.payment_schedule as PaymentMilestone[]) ?? [],
    timeline: (initial?.timeline as TimelinePhase[]) ?? [],
    terms: initial?.terms ?? defaultTerms,
    photos: (initial?.photos as ProposalPhoto[]) ?? [],
    status: initial?.status ?? "draft",
  };
}

const defaultTerms = `1. Payment Terms — Payment is due per the schedule above. Late payments accrue 1.5% per month.
2. Change Orders — Any changes to scope must be in writing and may affect price and timeline.
3. Materials — Material prices are valid for 30 days; substitutions of equal quality may occur.
4. Warranty — One year workmanship warranty from completion. Manufacturer warranties pass through.
5. Insurance — Contractor carries general liability and workers' compensation insurance.
6. Cancellation — Client may cancel within 3 business days of signing. Costs incurred are non-refundable.
7. Disputes — Any disputes will be resolved through binding arbitration in the contractor's home county.`;

export function ProposalEditor({
  userId,
  proposal,
}: {
  userId: string;
  proposal?: Proposal;
}) {
  const router = useRouter();
  const [state, setState] = useState<EditorState>(emptyState(proposal));
  const [proposalId, setProposalId] = useState<string | null>(proposal?.id ?? null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(
    () => state.line_items.reduce((s, i) => s + Number(i.total || 0), 0),
    [state.line_items],
  );

  function update<K extends keyof EditorState>(key: K, value: EditorState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function handleGenerate() {
    setError(null);
    if (!state.client_name) {
      setError("Add a client name first.");
      return;
    }
    setGenerating(true);
    try {
      const input: ProposalDraftInput = {
        client_name: state.client_name,
        client_email: state.client_email || null,
        client_address: state.client_address || null,
        project_type: state.project_type || null,
        scope: state.scope || null,
        measurements: state.measurements || null,
        materials: state.materials || null,
        labor: state.labor || null,
        notes: state.notes || null,
      };
      const res = await fetch("/api/proposals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      const lineItems: LineItem[] = (data.line_items || []).map((li: { description: string; quantity: number; unit: string; unit_price: number }) => ({
        id: uid(),
        description: li.description,
        quantity: Number(li.quantity) || 0,
        unit: li.unit || "ea",
        unit_price: Number(li.unit_price) || 0,
        total: (Number(li.quantity) || 0) * (Number(li.unit_price) || 0),
      }));
      const total = lineItems.reduce((s, i) => s + i.total, 0);
      const schedule: PaymentMilestone[] = (data.payment_schedule || []).map((m: { label: string; percent: number; due: string }) => ({
        id: uid(),
        label: m.label,
        percent: Number(m.percent) || 0,
        amount: Math.round(total * (Number(m.percent) || 0)) / 100,
        due: m.due,
      }));
      const timeline: TimelinePhase[] = (data.timeline || []).map((t: { phase: string; start: string; end: string; notes?: string }) => ({
        id: uid(),
        phase: t.phase,
        start: t.start,
        end: t.end,
        notes: t.notes,
      }));
      setState((s) => ({
        ...s,
        generated_text: data.narrative || s.generated_text,
        line_items: lineItems,
        payment_schedule: schedule,
        timeline,
        terms: data.terms || s.terms,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave(nextStatus?: Proposal["status"]) {
    setError(null);
    setSaving(true);
    const payload = {
      ...state,
      status: nextStatus ?? state.status,
      total_amount: subtotal,
    };
    try {
      const res = await fetch(
        proposalId ? `/api/proposals/${proposalId}` : "/api/proposals",
        {
          method: proposalId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      if (!proposalId) setProposalId(data.id);
      if (nextStatus) update("status", nextStatus);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!proposalId) return;
    if (!confirm("Delete this proposal? This cannot be undone.")) return;
    await fetch(`/api/proposals/${proposalId}`, { method: "DELETE" });
    router.replace("/dashboard");
    router.refresh();
  }

  async function handleExportPdf() {
    setExporting(true);
    setError(null);
    try {
      const { exportProposalPdf } = await import("@/lib/pdf");
      await exportProposalPdf({
        ...state,
        total_amount: subtotal,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {proposalId ? "Edit proposal" : "New proposal"}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Fill in the job details, then click Generate to draft a polished proposal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportPdf} className="btn-secondary" disabled={exporting}>
            {exporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            Export PDF
          </button>
          <button onClick={() => handleSave("draft")} className="btn-secondary" disabled={saving}>
            <Save size={16} /> {saving ? "Saving…" : "Save draft"}
          </button>
          <button onClick={() => handleSave("sent")} className="btn-primary" disabled={saving}>
            Mark as sent
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section className="card p-6">
        <h2 className="text-base font-semibold text-gray-900">Job details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Client name" required>
            <input className="input" value={state.client_name} onChange={(e) => update("client_name", e.target.value)} />
          </Field>
          <Field label="Client email">
            <input type="email" className="input" value={state.client_email} onChange={(e) => update("client_email", e.target.value)} />
          </Field>
          <Field label="Project address" className="sm:col-span-2">
            <input className="input" value={state.client_address} onChange={(e) => update("client_address", e.target.value)} />
          </Field>
          <Field label="Project type">
            <input className="input" placeholder="e.g. Roof replacement, Kitchen remodel"
              value={state.project_type} onChange={(e) => update("project_type", e.target.value)} />
          </Field>
          <Field label="Status">
            <select className="input" value={state.status} onChange={(e) => update("status", e.target.value as Proposal["status"])}>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="declined">Declined</option>
            </select>
          </Field>
          <Field label="Scope of work" className="sm:col-span-2">
            <textarea rows={3} className="input" value={state.scope} onChange={(e) => update("scope", e.target.value)}
              placeholder="What you'll do, materials removed/installed, finish quality…" />
          </Field>
          <Field label="Measurements">
            <textarea rows={2} className="input" value={state.measurements} onChange={(e) => update("measurements", e.target.value)}
              placeholder="e.g. 1,800 sq ft roof, 12/12 pitch, 2 layers of shingles" />
          </Field>
          <Field label="Materials">
            <textarea rows={2} className="input" value={state.materials} onChange={(e) => update("materials", e.target.value)}
              placeholder="Brand, grade, quantities" />
          </Field>
          <Field label="Labor notes">
            <textarea rows={2} className="input" value={state.labor} onChange={(e) => update("labor", e.target.value)}
              placeholder="Crew size, days estimated, special equipment" />
          </Field>
          <Field label="Other notes">
            <textarea rows={2} className="input" value={state.notes} onChange={(e) => update("notes", e.target.value)} />
          </Field>
          <div className="sm:col-span-2">
            <PhotoUpload userId={userId} photos={state.photos} onChange={(p) => update("photos", p)} />
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button onClick={handleGenerate} className="btn-primary" disabled={generating}>
            {generating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            {generating ? "Generating…" : "Generate proposal"}
          </button>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-gray-900">Proposal narrative</h2>
        <p className="mt-1 text-sm text-gray-600">Edit the AI-generated text or write your own.</p>
        <textarea
          rows={8}
          className="input mt-4 font-mono text-sm leading-6"
          value={state.generated_text}
          onChange={(e) => update("generated_text", e.target.value)}
          placeholder="Click Generate to draft, or write here directly…"
        />
      </section>

      <LineItemsTable
        items={state.line_items}
        subtotal={subtotal}
        onChange={(items) => update("line_items", items)}
      />

      <PaymentScheduleTable
        schedule={state.payment_schedule}
        subtotal={subtotal}
        onChange={(schedule) => update("payment_schedule", schedule)}
      />

      <TimelineTable
        timeline={state.timeline}
        onChange={(timeline) => update("timeline", timeline)}
      />

      <section className="card p-6">
        <h2 className="text-base font-semibold text-gray-900">Terms & conditions</h2>
        <textarea
          rows={10}
          className="input mt-4 font-mono text-sm leading-6"
          value={state.terms}
          onChange={(e) => update("terms", e.target.value)}
        />
      </section>

      {proposalId && (
        <div className="flex justify-end">
          <button onClick={handleDelete} className="btn-ghost text-red-600 hover:bg-red-50">
            <Trash2 size={16} /> Delete proposal
          </button>
        </div>
      )}
    </div>
  );
}

function Field({
  label, required, children, className,
}: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="label">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function LineItemsTable({
  items, subtotal, onChange,
}: { items: LineItem[]; subtotal: number; onChange: (items: LineItem[]) => void }) {
  function patch(id: string, partial: Partial<LineItem>) {
    onChange(items.map((i) => {
      if (i.id !== id) return i;
      const next = { ...i, ...partial };
      next.total = Number(next.quantity || 0) * Number(next.unit_price || 0);
      return next;
    }));
  }
  function add() {
    onChange([...items, { id: uid(), description: "", quantity: 1, unit: "ea", unit_price: 0, total: 0 }]);
  }
  function remove(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Itemized pricing</h2>
        <button onClick={add} className="btn-secondary"><Plus size={16} /> Add line</button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-2 py-2">Description</th>
              <th className="px-2 py-2 w-20">Qty</th>
              <th className="px-2 py-2 w-20">Unit</th>
              <th className="px-2 py-2 w-28">Unit price</th>
              <th className="px-2 py-2 w-28 text-right">Total</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((i) => (
              <tr key={i.id}>
                <td className="px-2 py-2"><input className="input" value={i.description} onChange={(e) => patch(i.id, { description: e.target.value })} /></td>
                <td className="px-2 py-2"><input type="number" min={0} step="any" className="input" value={i.quantity} onChange={(e) => patch(i.id, { quantity: Number(e.target.value) })} /></td>
                <td className="px-2 py-2"><input className="input" value={i.unit} onChange={(e) => patch(i.id, { unit: e.target.value })} /></td>
                <td className="px-2 py-2"><input type="number" min={0} step="any" className="input" value={i.unit_price} onChange={(e) => patch(i.id, { unit_price: Number(e.target.value) })} /></td>
                <td className="px-2 py-2 text-right tabular-nums">{currency(i.total)}</td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => remove(i.id)} className="text-gray-400 hover:text-red-600" aria-label="Remove">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={6} className="px-2 py-6 text-center text-sm text-gray-500">No line items yet. Generate or add manually.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200">
              <td colSpan={4} className="px-2 py-3 text-right text-sm font-medium text-gray-700">Subtotal</td>
              <td className="px-2 py-3 text-right text-base font-semibold tabular-nums">{currency(subtotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function PaymentScheduleTable({
  schedule, subtotal, onChange,
}: { schedule: PaymentMilestone[]; subtotal: number; onChange: (s: PaymentMilestone[]) => void }) {
  function patch(id: string, partial: Partial<PaymentMilestone>) {
    onChange(schedule.map((m) => {
      if (m.id !== id) return m;
      const next = { ...m, ...partial };
      next.amount = Math.round(subtotal * (Number(next.percent || 0))) / 100;
      return next;
    }));
  }
  function add() {
    onChange([...schedule, { id: uid(), label: "Milestone", percent: 0, amount: 0, due: "" }]);
  }
  function remove(id: string) {
    onChange(schedule.filter((m) => m.id !== id));
  }
  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Payment schedule</h2>
        <button onClick={add} className="btn-secondary"><Plus size={16} /> Add milestone</button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-2 py-2">Milestone</th>
              <th className="px-2 py-2 w-24">% of total</th>
              <th className="px-2 py-2 w-32">Due</th>
              <th className="px-2 py-2 w-32 text-right">Amount</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {schedule.map((m) => (
              <tr key={m.id}>
                <td className="px-2 py-2"><input className="input" value={m.label} onChange={(e) => patch(m.id, { label: e.target.value })} /></td>
                <td className="px-2 py-2"><input type="number" min={0} max={100} className="input" value={m.percent} onChange={(e) => patch(m.id, { percent: Number(e.target.value) })} /></td>
                <td className="px-2 py-2"><input className="input" placeholder="On signing / Mid-project / Completion" value={m.due} onChange={(e) => patch(m.id, { due: e.target.value })} /></td>
                <td className="px-2 py-2 text-right tabular-nums">{currency(m.amount)}</td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => remove(m.id)} className="text-gray-400 hover:text-red-600" aria-label="Remove">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {schedule.length === 0 && (
              <tr><td colSpan={5} className="px-2 py-6 text-center text-sm text-gray-500">No milestones yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TimelineTable({
  timeline, onChange,
}: { timeline: TimelinePhase[]; onChange: (t: TimelinePhase[]) => void }) {
  function patch(id: string, partial: Partial<TimelinePhase>) {
    onChange(timeline.map((t) => (t.id === id ? { ...t, ...partial } : t)));
  }
  function add() {
    onChange([...timeline, { id: uid(), phase: "Phase", start: "", end: "", notes: "" }]);
  }
  function remove(id: string) {
    onChange(timeline.filter((t) => t.id !== id));
  }
  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Project timeline</h2>
        <button onClick={add} className="btn-secondary"><Plus size={16} /> Add phase</button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-2 py-2">Phase</th>
              <th className="px-2 py-2 w-36">Start</th>
              <th className="px-2 py-2 w-36">End</th>
              <th className="px-2 py-2">Notes</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {timeline.map((t) => (
              <tr key={t.id}>
                <td className="px-2 py-2"><input className="input" value={t.phase} onChange={(e) => patch(t.id, { phase: e.target.value })} /></td>
                <td className="px-2 py-2"><input type="date" className="input" value={t.start} onChange={(e) => patch(t.id, { start: e.target.value })} /></td>
                <td className="px-2 py-2"><input type="date" className="input" value={t.end} onChange={(e) => patch(t.id, { end: e.target.value })} /></td>
                <td className="px-2 py-2"><input className="input" value={t.notes ?? ""} onChange={(e) => patch(t.id, { notes: e.target.value })} /></td>
                <td className="px-2 py-2 text-right">
                  <button onClick={() => remove(t.id)} className="text-gray-400 hover:text-red-600" aria-label="Remove">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {timeline.length === 0 && (
              <tr><td colSpan={5} className="px-2 py-6 text-center text-sm text-gray-500">No phases yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
